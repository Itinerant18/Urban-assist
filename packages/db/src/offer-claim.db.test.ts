import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

// Guards claim_booking_for_provider (202608070003): a provider holding two
// overlapping offers must not be able to accept both. Before that migration the
// accept path had only a per-offer Redis lock and a `provider_id is null`
// compare-and-swap, neither of which serialises two different offers for one
// provider.
//
// Same env/skip convention as rls.db.test.ts — keys come from the gitignored
// .env.local rather than literals, so secret scanners stay quiet.
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

async function localSupabaseReachable(): Promise<boolean> {
  if (!ANON_KEY || !SERVICE_KEY) return false;
  try {
    const res = await fetch(`${LOCAL_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const reachable = await localSupabaseReachable();

describe.skipIf(!reachable)('claim_booking_for_provider overlap guard', () => {
  let admin: SupabaseClient;
  let categoryId: string;
  const created: string[] = [];

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
      await admin.from('bookings').delete().in('id', created);
      created.length = 0;
    }
  });

  // scheduled_at is part of bookings_dedupe_active_idx, so each booking gets a
  // distinct slot and the offsets below stay inside/outside the ±60 min window.
  async function makeBooking(minutesFromNow: number): Promise<string> {
    const scheduledAt = new Date(Date.now() + minutesFromNow * 60_000).toISOString();
    const { data, error } = await admin
      .from('bookings')
      .insert({
        customer_id: CUSTOMER,
        category_id: categoryId,
        provider_service_id: PROVIDER_SERVICE,
        address_id: ADDRESS,
        scheduled_at: scheduledAt,
        status: 'pending_match',
        price_pence: 5000,
        vat_pence: 1000,
        total_pence: 6000,
        payment_method: 'cash',
      })
      .select('id')
      .single();
    if (error) throw error;
    created.push((data as any).id);
    return (data as any).id;
  }

  function claim(bookingId: string) {
    return admin.rpc('claim_booking_for_provider', {
      p_booking_id: bookingId,
      p_provider_id: PROVIDER,
    });
  }

  it('rejects a second claim that overlaps one already held', async () => {
    const first = await makeBooking(180);
    const overlapping = await makeBooking(210); // +30 min — inside the ±60 min window

    const firstClaim = await claim(first);
    expect(firstClaim.error).toBeNull();
    expect(firstClaim.data).toHaveLength(1);

    // The BEFORE UPDATE trigger bookings_touch_matched (0003_triggers.sql) flips
    // status to 'assigned' when provider_id is first set, which is what makes the
    // first booking visible to the busy-window check.
    const second = await claim(overlapping);
    expect(second.error?.message ?? '').toContain('provider_schedule_conflict');

    const { data: stillFree } = await admin
      .from('bookings')
      .select('provider_id, status')
      .eq('id', overlapping)
      .single();
    expect((stillFree as any).provider_id).toBeNull();
    expect((stillFree as any).status).toBe('pending_match');
  });

  it('allows a second claim outside the busy window', async () => {
    const first = await makeBooking(180);
    const later = await makeBooking(400); // +220 min — clear of the ±60 min window

    expect((await claim(first)).error).toBeNull();

    const second = await claim(later);
    expect(second.error).toBeNull();
    expect(second.data).toHaveLength(1);
  });

  it('returns no rows when the booking was already claimed', async () => {
    const booking = await makeBooking(180);
    expect((await claim(booking)).error).toBeNull();

    // Re-claiming is not an error — the caller expires the offer on an empty result,
    // matching the behaviour of the compare-and-swap this replaced.
    const again = await claim(booking);
    expect(again.error).toBeNull();
    expect(again.data).toHaveLength(0);
  });
});
