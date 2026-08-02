import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findCandidates } from './services/matching-engine';

/**
 * DB-backed proof that findCandidates excludes training-ineligible providers and
 * emits the observation metric at filter time — the collateral this replaces was
 * real: un-acceptable offers burning OFFER_TTL each and dinging acceptance_rate.
 *
 * Local demo keys (iss: supabase-demo) — identical on every install, not secrets.
 */
const LOCAL_URL = 'http://127.0.0.1:54321';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const PROVIDER = 'a0000000-0000-4000-8000-000000000001'; // seeded, approved, online

async function reachable(): Promise<boolean> {
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
    admin = createClient(LOCAL_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // A category the seed gates but gives no provider completions for.
    const { data: cat } = await admin
      .from('service_categories')
      .select('id, training_items!inner(id, pass_score)')
      .eq('training_items.gates_category', true)
      .eq('training_items.is_active', true)
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

    const { data: addr } = await admin.from('addresses').select('id, profile_id').limit(1).single();

    // The availability filter runs before the training filter, so the booking must
    // land inside one of the provider's seeded working slots or they are dropped for
    // the wrong reason and both assertions here go blind. Noon UTC keeps the London
    // calendar date equal to the UTC date in both GMT and BST, and 12:00/13:00 local
    // sits inside any working-hours slot.
    const { data: slot } = await admin
      .from('availability_slots')
      .select('weekday')
      .eq('provider_id', PROVIDER)
      .limit(1)
      .single();
    const when = new Date();
    when.setUTCHours(12, 0, 0, 0);
    do {
      when.setUTCDate(when.getUTCDate() + 1);
    } while (when.getUTCDay() !== (slot as any).weekday);

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
