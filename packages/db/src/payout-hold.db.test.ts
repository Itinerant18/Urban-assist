import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Guards the payout hold added in 202608080004.
//
// claim_booking_payout gates only on booking.status = 'completed' and a succeeded card
// payment, and pays bookings.price_pence net of commission. It never consulted refunds or
// disputes, so a partially refunded job paid the provider on the full price (the platform
// funding the difference) and a disputed job paid out while Stripe reclaimed the money.
// Full refunds were already safe because payments.status flips to 'refunded'; partials
// cannot flip it, since payment_status has no 'partially_refunded' value.
function envLocal(name: string): string | null {
  if (process.env[name]) return process.env[name]!;
  try {
    const raw = readFileSync('apps/customer/.env.local', 'utf8');
    return raw.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

const LOCAL_URL = envLocal('NEXT_PUBLIC_SUPABASE_URL') ?? 'http://127.0.0.1:54321';
const ANON_KEY = envLocal('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE_KEY = envLocal('SUPABASE_SERVICE_ROLE_KEY');

// Fixtures from supabase/seed.sql
const PROVIDER = 'a0000000-0000-4000-8000-000000000001';
const CUSTOMER = 'a0000000-0000-4000-8000-000000000003';
const ADDRESS = 'c1000000-0000-4000-8000-000000000001';
const PROVIDER_SERVICE = 'd1000000-0000-4000-8000-000000000001';
const PRICE = 20000; // £200

async function localSupabaseReachable(): Promise<boolean> {
  if (!ANON_KEY || !SERVICE_KEY) return false;
  try {
    const res = await fetch(`${LOCAL_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const reachable = await localSupabaseReachable();

describe.skipIf(!reachable)('payout holds', () => {
  let admin: SupabaseClient;
  let categoryId: string;
  const created: string[] = [];
  // Far enough out that these completed fixtures cannot collide with the seed's live
  // bookings under the new provider-overlap exclusion constraint.
  let slot = 60 * 24 * 90;

  beforeAll(async () => {
    admin = createClient(LOCAL_URL, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin
      .from('provider_services')
      .select('category_id')
      .eq('id', PROVIDER_SERVICE)
      .single();
    categoryId = (data as any).category_id;
  });

  afterEach(async () => {
    if (created.length) {
      await admin.from('payouts').delete().in('booking_id', created);
      await admin.from('payments').delete().in('booking_id', created);
      await admin.from('bookings').delete().in('id', created);
      created.length = 0;
    }
  });

  // A completed, card-paid, provider-assigned booking — the shape claim_booking_payout
  // considers payable.
  async function payableBooking(): Promise<string> {
    slot += 500; // distinct slot per fixture
    const scheduledAt = new Date(Date.now() + slot * 60_000).toISOString();
    const { data, error } = await admin
      .from('bookings')
      .insert({
        customer_id: CUSTOMER,
        provider_id: PROVIDER,
        category_id: categoryId,
        provider_service_id: PROVIDER_SERVICE,
        address_id: ADDRESS,
        scheduled_at: scheduledAt,
        status: 'completed',
        completed_at: new Date().toISOString(),
        price_pence: PRICE,
        vat_pence: 0,
        total_pence: PRICE,
        payment_method: 'card',
      })
      .select('id')
      .single();
    if (error) throw error;
    const id = (data as any).id;
    created.push(id);

    const { error: payErr } = await admin.from('payments').insert({
      booking_id: id,
      method: 'card',
      stripe_payment_intent_id: `pi_test_${id}`,
      amount_pence: PRICE,
      vat_pence: 0,
      status: 'succeeded',
    });
    if (payErr) throw payErr;
    return id;
  }

  const claimPayout = (bookingId: string) =>
    admin.rpc('claim_booking_payout', { p_booking_id: bookingId });

  it('pays out normally when no hold is set', async () => {
    const booking = await payableBooking();
    const res = await claimPayout(booking);
    expect(res.error).toBeNull();
    expect(res.data?.[0]?.claim_state).toBe('claimed');
  });

  it('refuses to claim a partially refunded booking', async () => {
    const booking = await payableBooking();
    const { error: holdErr } = await admin.rpc('set_booking_payout_hold', {
      p_booking_id: booking,
      p_reason: 'partial_refund:15000_of_20000',
    });
    expect(holdErr).toBeNull();

    const res = await claimPayout(booking);
    expect(res.error?.message ?? '').toContain('payout_on_hold');
    // And nothing was queued for transfer.
    const { data: payouts } = await admin.from('payouts').select('id').eq('booking_id', booking);
    expect(payouts ?? []).toHaveLength(0);
  });

  it('refuses to claim a disputed booking', async () => {
    const booking = await payableBooking();
    await admin.rpc('set_booking_payout_hold', {
      p_booking_id: booking,
      p_reason: 'dispute:fraudulent',
    });
    const res = await claimPayout(booking);
    expect(res.error?.message ?? '').toContain('payout_on_hold');
  });

  it('keeps held money out of the releasable figures the admin dashboard offers', async () => {
    const booking = await payableBooking();

    const before = await admin.rpc('get_admin_financial_dashboard');
    expect(before.error).toBeNull();
    const readyBefore = (before.data as any).metrics.ready_pence;
    const heldBefore = (before.data as any).metrics.held_pence;

    await admin.rpc('set_booking_payout_hold', {
      p_booking_id: booking,
      p_reason: 'dispute:product_not_received',
    });

    const after = await admin.rpc('get_admin_financial_dashboard');
    const readyAfter = (after.data as any).metrics.ready_pence;
    const heldAfter = (after.data as any).metrics.held_pence;

    // Commission defaults to 0 bps locally, so the net equals the price.
    expect(readyBefore - readyAfter).toBe(PRICE);
    expect(heldAfter - heldBefore).toBe(PRICE);
  });
});
