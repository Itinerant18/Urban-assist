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
  // Read rather than hardcoded: the overlap window is now the real job duration, so every
  // offset below is relative to it.
  let serviceDuration = 60;
  const created: string[] = [];

  beforeAll(async () => {
    admin = createClient(LOCAL_URL, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin
      .from('provider_services')
      .select('category_id, duration_mins, service_skus(duration_mins)')
      .eq('id', PROVIDER_SERVICE)
      .single();
    categoryId = (data as any).category_id;
    const sku = (data as any).service_skus;
    serviceDuration =
      (Array.isArray(sku) ? sku[0]?.duration_mins : sku?.duration_mins) ??
      (data as any).duration_mins ??
      60;
    // The duration-aware test below is only meaningful if the job outlasts the old
    // ±60 minute window it replaced.
    expect(serviceDuration).toBeGreaterThan(60);
  });

  afterEach(async () => {
    if (created.length) {
      await admin.from('bookings').delete().in('id', created);
      created.length = 0;
    }
  });

  // Offsets are measured from BASE, not from now. supabase/seed.sql already gives this
  // provider bookings in busy statuses at now-30min (in_progress), now+3h (on_the_way)
  // and now+2d (assigned) — an earlier version of this test used now+3h and every case
  // failed on a genuine conflict with the seed. BASE sits 30 days out, clear of all of
  // them; assertSlotFree below fails loudly if a future seed change reaches that far.
  const BASE_MINUTES = 60 * 24 * 30;

  // scheduled_at is part of bookings_dedupe_active_idx, so each booking gets a
  // distinct slot and the offsets below stay inside/outside the ±60 min window.
  async function makeBooking(minutesFromBase: number): Promise<string> {
    const scheduledAt = new Date(
      Date.now() + (BASE_MINUTES + minutesFromBase) * 60_000,
    ).toISOString();
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

  // Guards the fixture, not the code under test: if seed data ever puts a busy booking
  // near BASE, every assertion below would fail with provider_schedule_conflict and look
  // like a broken guard rather than a broken fixture.
  async function assertSlotFree(minutesFromBase: number) {
    const at = new Date(Date.now() + (BASE_MINUTES + minutesFromBase) * 60_000).toISOString();
    const ends = new Date(
      Date.now() + (BASE_MINUTES + minutesFromBase + serviceDuration) * 60_000,
    ).toISOString();
    const { data, error } = await admin.rpc('provider_has_conflicting_booking', {
      p_provider_id: PROVIDER,
      p_scheduled_at: at,
      p_ends_at: ends,
      p_exclude_booking_id: null,
    });
    expect(error).toBeNull();
    expect(data, `fixture slot at BASE+${minutesFromBase}min is already busy in seed data`).toBe(
      false,
    );
  }

  it('rejects a second claim that overlaps one already held', async () => {
    await assertSlotFree(0);
    const first = await makeBooking(0);
    const overlapping = await makeBooking(30); // +30 min — inside the ±60 min window

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

  // The regression test for 202608080003. The old guard compared start times against a
  // flat ±60 minutes, so this pair — a long job and a second booking starting after that
  // window but well before the first one ends — was allowed and double-booked the
  // provider for the remainder.
  it('rejects an overlap that starts beyond 60 minutes but inside a long job', async () => {
    const offset = serviceDuration - 30; // inside the real job, outside ±60 min
    expect(offset).toBeGreaterThan(60);

    await assertSlotFree(0);
    const first = await makeBooking(0);
    const overlapping = await makeBooking(offset);

    expect((await claim(first)).error).toBeNull();

    const second = await claim(overlapping);
    expect(second.error?.message ?? '').toContain('provider_schedule_conflict');
  });

  // The function guard can be bypassed by anything writing bookings directly; the GiST
  // exclusion constraint cannot.
  it('blocks a direct overlapping assignment at the storage layer', async () => {
    await assertSlotFree(0);
    const first = await makeBooking(0);
    const overlapping = await makeBooking(30);
    expect((await claim(first)).error).toBeNull();

    // Straight UPDATE, no RPC, no advisory lock — exactly the path the function cannot see.
    const { error } = await admin
      .from('bookings')
      .update({ provider_id: PROVIDER, status: 'assigned' })
      .eq('id', overlapping);
    expect(error, 'exclusion constraint should have rejected this').not.toBeNull();
    expect(error?.message ?? '').toMatch(/bookings_no_provider_overlap|exclusion/i);
  });

  it('allows a second claim outside the busy window', async () => {
    const clear = serviceDuration + 100; // past the end of the first job
    await assertSlotFree(0);
    await assertSlotFree(clear);
    const first = await makeBooking(0);
    const later = await makeBooking(clear);

    expect((await claim(first)).error).toBeNull();

    const second = await claim(later);
    expect(second.error).toBeNull();
    expect(second.data).toHaveLength(1);
  });

  it('returns no rows when the booking was already claimed', async () => {
    await assertSlotFree(0);
    const booking = await makeBooking(0);
    expect((await claim(booking)).error).toBeNull();

    // Re-claiming is not an error — the caller expires the offer on an empty result,
    // matching the behaviour of the compare-and-swap this replaced.
    const again = await claim(booking);
    expect(again.error).toBeNull();
    expect(again.data).toHaveLength(0);
  });
});
