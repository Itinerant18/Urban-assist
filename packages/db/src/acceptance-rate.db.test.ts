import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Guards recompute_acceptance (202608080006).
//
// The trigger puts every accepted/declined/expired offer in the denominator and only
// 'accepted' in the numerator, so a decline the provider did not choose lowered their
// acceptance_rate. Two such cases exist now that the overlap guard is duration-aware:
// 'schedule_conflict' (they accepted, the guard rejected it) and 'taken_by_other' (they
// accepted, someone else had already won). Both must be rate-neutral. A plain lapse with
// no decline_reason must still count — that IS their acceptance behaviour.
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

const PROVIDER = 'a0000000-0000-4000-8000-000000000001';
const CUSTOMER = 'a0000000-0000-4000-8000-000000000003';
const ADDRESS = 'c1000000-0000-4000-8000-000000000001';
const PROVIDER_SERVICE = 'd1000000-0000-4000-8000-000000000001';

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

describe.skipIf(!reachable)('acceptance_rate excludes system declines', () => {
  let admin: SupabaseClient;
  let categoryId: string;
  const bookings: string[] = [];
  let slot = 60 * 24 * 120;

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
    // Offers cascade-delete with their booking.
    if (bookings.length) {
      await admin.from('bookings').delete().in('id', bookings);
      bookings.length = 0;
    }
  });

  async function makeOffer(): Promise<string> {
    slot += 400;
    const { data: b, error: bErr } = await admin
      .from('bookings')
      .insert({
        customer_id: CUSTOMER,
        category_id: categoryId,
        provider_service_id: PROVIDER_SERVICE,
        address_id: ADDRESS,
        scheduled_at: new Date(Date.now() + slot * 60_000).toISOString(),
        status: 'pending_match',
        price_pence: 5000,
        vat_pence: 1000,
        total_pence: 6000,
        payment_method: 'cash',
      })
      .select('id')
      .single();
    if (bErr) throw bErr;
    bookings.push((b as any).id);

    const { data: o, error: oErr } = await admin
      .from('booking_offers')
      .insert({
        booking_id: (b as any).id,
        provider_id: PROVIDER,
        status: 'pending',
        rank: 1,
        responds_by: new Date(Date.now() + 90_000).toISOString(),
      })
      .select('id')
      .single();
    if (oErr) throw oErr;
    return (o as any).id;
  }

  async function resolve(offerId: string, patch: Record<string, unknown>) {
    const { error } = await admin.from('booking_offers').update(patch).eq('id', offerId);
    if (error) throw error;
  }

  async function acceptanceRate(): Promise<number> {
    const { data } = await admin
      .from('profiles')
      .select('acceptance_rate')
      .eq('id', PROVIDER)
      .single();
    return Number((data as any).acceptance_rate);
  }

  // Assertions are relative, not absolute: seed.sql already gives this provider offers
  // inside the trigger's 30-day window, so any hardcoded ratio depends on fixture counts.
  // Each case establishes a baseline with an accepted offer, then checks how one more
  // resolved offer moves it.
  async function acceptedBaseline(): Promise<number> {
    const accepted = await makeOffer();
    await resolve(accepted, { status: 'accepted', responded_at: new Date().toISOString() });
    return acceptanceRate();
  }

  it('leaves the rate unchanged for a schedule_conflict decline', async () => {
    const before = await acceptedBaseline();

    const conflicted = await makeOffer();
    await resolve(conflicted, {
      status: 'declined',
      responded_at: new Date().toISOString(),
      decline_reason: 'schedule_conflict',
      resolved_by_system: true,
    });

    expect(await acceptanceRate()).toBeCloseTo(before, 6);
  });

  it('leaves the rate unchanged when another provider won the race', async () => {
    const before = await acceptedBaseline();

    const takenByOther = await makeOffer();
    await resolve(takenByOther, {
      status: 'expired',
      responded_at: new Date().toISOString(),
      decline_reason: 'taken_by_other',
      resolved_by_system: true,
    });

    expect(await acceptanceRate()).toBeCloseTo(before, 6);
  });

  // 202608080006 keyed rate-neutrality off decline_reason, which is free-form client input
  // (z.string().max(200), written verbatim). A provider could send
  // decline_reason: 'schedule_conflict' on every decline and pin their rate at 1.0.
  // The marker is now resolved_by_system, which no client input reaches.
  it('does NOT go rate-neutral on a forged decline_reason alone', async () => {
    const before = await acceptedBaseline();

    const forged = await makeOffer();
    await resolve(forged, {
      status: 'declined',
      responded_at: new Date().toISOString(),
      decline_reason: 'schedule_conflict', // the text, without the system flag
    });

    expect(await acceptanceRate()).toBeLessThan(before);
  });

  it('lowers the rate for a genuine decline', async () => {
    const before = await acceptedBaseline();

    const refused = await makeOffer();
    await resolve(refused, {
      status: 'declined',
      responded_at: new Date().toISOString(),
      decline_reason: 'too_far',
    });

    expect(await acceptanceRate()).toBeLessThan(before);
  });

  it('lowers the rate for a plain lapse with no decline_reason', async () => {
    const before = await acceptedBaseline();

    const lapsed = await makeOffer();
    await resolve(lapsed, { status: 'expired', responded_at: new Date().toISOString() });

    // The null-handling catcher. is_system_decline_reason(null) originally returned NULL
    // rather than false, so `not (...)` was null, every offer with a null decline_reason
    // (including all accepted ones) fell out of the WHERE clause, count(*) hit 0 and the
    // rate snapped to the 1.0 fallback. With that bug this asserts 1.0 < before and fails.
    expect(await acceptanceRate()).toBeLessThan(before);
  });

  // "offers provider respond" (0002_rls.sql) was `for update using (provider_id =
  // auth.uid())` with no WITH CHECK and no column scope, and booking_offers never had its
  // baseline grants revoked — so a provider could PATCH /rest/v1/booking_offers directly
  // and flip their own declined offers to 'accepted'. 202608080007 revokes client writes.
  it('rejects a client-side write to booking_offers', async () => {
    const offerId = await makeOffer();

    const anon = createClient(LOCAL_URL, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error, data } = await anon
      .from('booking_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId)
      .select('id');

    // Either an outright permission error, or zero rows affected. What must NOT happen is
    // the row changing.
    expect(data ?? []).toHaveLength(0);
    if (!error) {
      const { data: after } = await admin
        .from('booking_offers')
        .select('status')
        .eq('id', offerId)
        .single();
      expect((after as any).status).toBe('pending');
    }
  });
});
