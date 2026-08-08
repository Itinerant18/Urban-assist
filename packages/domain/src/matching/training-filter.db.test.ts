import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findCandidates } from './services/matching-engine';

import { readFileSync } from 'node:fs';

/**
 * DB-backed proof that findCandidates excludes training-ineligible providers and
 * emits the observation metric at filter time — the collateral this replaces was
 * real: un-acceptable offers burning OFFER_TTL each and dinging acceptance_rate.
 *
 * Keys are read from the gitignored .env.local that local setup creates. They are
 * only the public supabase-demo tokens, but JWT-shaped literals in source trip
 * secret scanners on every future PR, and normalising dismissed alerts is worse.
 */
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

const PROVIDER = 'a0000000-0000-4000-8000-000000000001'; // seeded, approved, online

async function reachable(): Promise<boolean> {
  if (!ANON_KEY || !SERVICE_KEY) return false; // no local env captured -> skip
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

const up = await reachable();

describe.skipIf(!up)('training gating in findCandidates (local Supabase)', () => {
  let admin: SupabaseClient;
  let categoryId: string;
  let gatingItemId: string;
  let passScore: number;
  let bookingId: string;
  let serviceId: string | null = null;

  beforeAll(async () => {
    admin = createClient(LOCAL_URL, SERVICE_KEY!, { auth: { persistSession: false } });

    // A category the seed gates but gives no provider completions for.
    const { data: cat } = await admin
      .from('service_categories')
      .select('id, training_items!inner(id, pass_score)')
      .eq('training_items.gates_category', true)
      .eq('training_items.is_active', true)
      // Ordered: an unordered limit(1) returns whatever row the heap yields, which shifts as
      // other suites churn these tables — that nondeterminism is what made this file flaky.
      .order('id')
      .limit(1)
      .single();
    categoryId = (cat as any).id;
    gatingItemId = (cat as any).training_items[0].id;
    passScore = (cat as any).training_items[0].pass_score ?? 0;

    // The provider must offer the category or findCandidates never considers them.
    const { data: svc, error: svcErr } = await admin
      .from('provider_services')
      .insert({
        provider_id: PROVIDER,
        category_id: categoryId,
        title: 'gating-test fixture',
        price_pence: 5000,
        duration_mins: 60,
        is_active: true,
      })
      .select('id')
      .single();
    if (svcErr) throw svcErr;
    serviceId = svc.id;

    const { data: addr } = await admin
      .from('addresses')
      .select('id, profile_id')
      .order('id')
      .limit(1)
      .single();

    // The availability filter runs before the training filter, so the booking must
    // land inside one of the provider's seeded working slots or they are dropped for
    // the wrong reason and both assertions here go blind. Noon UTC keeps the London
    // calendar date equal to the UTC date in both GMT and BST, and 12:00/13:00 local
    // sits inside any working-hours slot.
    const { data: slot } = await admin
      .from('availability_slots')
      .select('weekday, start_time, end_time')
      .eq('provider_id', PROVIDER)
      // The root cause of the flake: without an order, this returned a different weekday
      // between runs, and some of those weekdays put the booking where the provider is not
      // available at all. They were then excluded for AVAILABILITY rather than training, so
      // the metric assertion below failed while looking like a training-filter bug.
      .order('weekday')
      .limit(1)
      .single();

    // Matches findCandidates, which reads availability_slots.weekday as 0=Sunday via
    // getUTCDay() (matching-engine.ts:55) — the convention the seed documents. Do NOT
    // "correct" this to isodow-1: get_assignment_candidates in SQL uses Monday=0 for the same
    // column, so the two production paths genuinely disagree. That is a real bug, tracked
    // separately; this test must follow the path it actually exercises.
    const slotWeekday = (d: Date) => d.getUTCDay();

    // Inside the next 7 days. The other suites that book this same seeded provider sit in
    // deliberately separate bands — offer-claim ~30d out, payout-hold ~90d, acceptance-rate
    // ~120d — so nothing they insert can land in the ±60-minute busy window findCandidates
    // checks. Keep that separation when adding a suite, or availability here starts flapping.
    const when = new Date();
    when.setUTCHours(12, 0, 0, 0);
    do {
      when.setUTCDate(when.getUTCDate() + 1);
    } while (slotWeekday(when) !== (slot as any).weekday);

    // Guards the fixture, not the code under test. If the booking falls outside the
    // provider's working hours or collides with a seeded busy booking, they are excluded for
    // availability and BOTH assertions below silently measure the wrong thing — which is
    // exactly how the flake stayed misdiagnosed. Fail loudly here instead.
    expect(slotWeekday(when), 'fixture weekday must match the chosen slot').toBe(
      (slot as any).weekday,
    );
    const startsAt = when.toISOString().slice(11, 19);
    const endsAt = new Date(when.getTime() + 60 * 60_000).toISOString().slice(11, 19);
    expect(startsAt >= (slot as any).start_time, `booking ${startsAt} starts before slot`).toBe(true);
    expect(endsAt <= (slot as any).end_time, `booking ends ${endsAt}, after slot`).toBe(true);

    const { data: clash } = await admin.rpc('provider_has_conflicting_booking', {
      p_provider_id: PROVIDER,
      p_scheduled_at: when.toISOString(),
      p_ends_at: new Date(when.getTime() + 60 * 60_000).toISOString(),
      p_exclude_booking_id: null,
    });
    expect(clash, 'fixture slot collides with a seeded busy booking').toBe(false);

    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .insert({
        customer_id: (addr as any).profile_id,
        category_id: categoryId,
        provider_service_id: serviceId,
        address_id: (addr as any).id,
        scheduled_at: when.toISOString(),
        status: 'pending_match',
        price_pence: 5000,
        vat_pence: 1000,
        total_pence: 6000,
        payment_method: 'cash',
      })
      .select('id')
      .single();
    if (bErr) throw bErr;
    bookingId = booking.id;
  });

  afterAll(async () => {
    // beforeAll can die before `admin` is assigned (it did in CI: supabase-js throws on
    // construction under Node 20, which has no global WebSocket). Cleanup then threw a
    // TypeError that replaced the real error in the report and cost an hour of diagnosis.
    if (!admin) return;
    if (bookingId) await admin.from('bookings').delete().eq('id', bookingId);
    if (serviceId) await admin.from('provider_services').delete().eq('id', serviceId);
    await admin
      .from('provider_training_completions')
      .delete()
      .eq('provider_id', PROVIDER)
      .eq('item_id', gatingItemId);
    await admin
      .from('analytics_events')
      .delete()
      .eq('type', 'offer.blocked_training')
      .eq('payload->>booking_id', bookingId);
  });

  it('excludes an untrained provider and emits the metric at filter time', async () => {
    const candidates = await findCandidates(admin, bookingId);
    expect(candidates.map((c) => c.provider_id)).not.toContain(PROVIDER);

    const { data: events } = await admin
      .from('analytics_events')
      .select('payload')
      .eq('type', 'offer.blocked_training')
      .eq('payload->>booking_id', bookingId)
      .eq('payload->>provider_id', PROVIDER);
    expect(events?.length).toBeGreaterThan(0);
    expect((events![0] as any).payload.stage).toBe('candidate_filter');
  });

  it('includes the provider once the gating module is passed', async () => {
    const { error } = await admin.from('provider_training_completions').upsert(
      { provider_id: PROVIDER, item_id: gatingItemId, score: passScore },
      { onConflict: 'provider_id,item_id' },
    );
    expect(error).toBeNull();

    const candidates = await findCandidates(admin, bookingId);
    expect(candidates.map((c) => c.provider_id)).toContain(PROVIDER);
  });
});
