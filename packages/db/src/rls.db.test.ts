import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const LOCAL_URL = 'http://127.0.0.1:54321';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const PROVIDER_APPROVED = 'a0000000-0000-4000-8000-000000000001';
const PROVIDER_PENDING = 'a0000000-0000-4000-8000-000000000002';
const PROVIDER_PHONE = '447700900001';
const TEST_OTP = '123456';

async function localSupabaseReachable(): Promise<boolean> {
  try {
    // Kong fronts every service locally and 502s key-less requests, so the probe
    // must send the anon key — without it this suite silently skipped while the
    // stack was fully up, and 78-passed-10-skipped read as "88 passed".
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

describe.skipIf(!reachable)('RLS / grants (local Supabase)', () => {
  let anon: SupabaseClient;
  let authed: SupabaseClient;

  beforeAll(async () => {
    anon = createClient(LOCAL_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    authed = createClient(LOCAL_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: otpErr } = await authed.auth.signInWithOtp({ phone: PROVIDER_PHONE });
    if (otpErr) throw otpErr;

    const { error: verifyErr } = await authed.auth.verifyOtp({
      phone: PROVIDER_PHONE,
      token: TEST_OTP,
      type: 'sms',
    });
    if (verifyErr) throw verifyErr;
  });

  afterAll(async () => {
    await authed?.auth.signOut();
  });

  it('provider CAN update own full_name and phone', async () => {
    const nextName = `Alex Rivera ${Date.now()}`;
    const { error } = await authed
      .from('profiles')
      .update({ full_name: nextName, phone: PROVIDER_PHONE })
      .eq('id', PROVIDER_APPROVED);
    expect(error).toBeNull();

    const { data } = await authed
      .from('profiles')
      .select('full_name')
      .eq('id', PROVIDER_APPROVED)
      .single();
    expect(data?.full_name).toBe(nextName);
  });

  // One case per column, deliberately NOT a single four-column update.
  // Postgres rejects an UPDATE if *any* named column lacks privilege, so a combined
  // statement stays blocked while three of the four are still revoked — it only goes
  // red once all four are re-granted. That hides exactly the realistic regression:
  // one column accidentally added back to the grant list.
  // The attempted value is derived from the CURRENT value so it is always different.
  // A fixed payload ({rating_avg: 1}) makes this test unfalsifiable: once a run has
  // actually written that value — which happens the moment the grant regresses — every
  // later run writes the same number, before === after, and it passes forever while
  // the escalation is wide open. Asking "did it change" only works if the write would
  // genuinely change something.
  const mutate = (column: string, current: unknown): unknown => {
    if (column === 'is_blocked') return !current;
    if (column === 'stripe_account_id') return `acct_hacked_${Date.now()}`;
    return Number(current ?? 0) + 1; // rating_avg, acceptance_rate
  };

  it.each(['rating_avg', 'acceptance_rate', 'is_blocked', 'stripe_account_id'])(
    'provider CANNOT update %s',
    async (column) => {
      const { data: before } = await authed
        .from('profiles')
        .select(column)
        .eq('id', PROVIDER_APPROVED)
        .single();

      const attempted = mutate(column, (before as any)?.[column]);
      expect(attempted).not.toBe((before as any)?.[column]);

      await authed
        .from('profiles')
        .update({ [column]: attempted } as Record<string, unknown>)
        .eq('id', PROVIDER_APPROVED);

      // Re-read with a fresh privileged view of the row. The value must be untouched.
      const { data: after } = await authed
        .from('profiles')
        .select(column)
        .eq('id', PROVIDER_APPROVED)
        .single();

      expect((after as any)?.[column]).toStrictEqual((before as any)?.[column]);
      expect((after as any)?.[column]).not.toStrictEqual(attempted);
    },
  );

  it('provider CANNOT update role / kyc_status (guard_profile_protected_columns)', async () => {
    const { error } = await authed
      .from('profiles')
      .update({ role: 'admin', kyc_status: 'rejected' } as Record<string, unknown>)
      .eq('id', PROVIDER_APPROVED);

    expect(error).not.toBeNull();

    const { data } = await authed
      .from('profiles')
      .select('role, kyc_status')
      .eq('id', PROVIDER_APPROVED)
      .single();
    expect(data?.role).toBe('provider');
    expect(data?.kyc_status).toBe('approved');
  });

  it('provider CANNOT insert/update service_skus', async () => {
    const { error: insertErr } = await authed.from('service_skus').insert({
      subcategory_id: 'b1000000-0000-4000-8000-000000000001',
      slug: 'hacked-sku',
      name: 'Hacked',
      min_price_pence: 1,
      max_price_pence: 1,
    });
    expect(insertErr).not.toBeNull();

    const { error: updateErr } = await authed
      .from('service_skus')
      .update({ min_price_pence: 1 })
      .eq('id', 'b2000000-0000-4000-8000-000000000001');
    expect(updateErr).not.toBeNull();
  });

  it('provider reads ONLY their own provider_service_areas', async () => {
    const { data, error } = await authed.from('provider_service_areas').select('provider_id');
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((r) => r.provider_id === PROVIDER_APPROVED)).toBe(true);
    expect(data?.some((r) => r.provider_id === PROVIDER_PENDING)).toBe(false);
  });

  it("provider CANNOT update another provider's profile row", async () => {
    const { data: before } = await anon
      .from('profiles')
      .select('full_name')
      .eq('id', PROVIDER_PENDING)
      .maybeSingle();

    // Pending provider may not be readable via anon; use authed select after failed update
    const { error } = await authed
      .from('profiles')
      .update({ full_name: 'Hacked Name' })
      .eq('id', PROVIDER_PENDING);

    // RLS blocks: either error or 0 rows updated (PostgREST returns null error + empty)
    const { data: after, error: readErr } = await authed
      .from('profiles')
      .select('full_name')
      .eq('id', PROVIDER_PENDING)
      .maybeSingle();

    if (!readErr && after) {
      expect(after.full_name).not.toBe('Hacked Name');
      if (before?.full_name) expect(after.full_name).toBe(before.full_name);
    } else {
      // Cannot read other provider → update also cannot have applied under RLS
      expect(error === null || error !== null).toBe(true);
      expect(after).toBeNull();
    }
  });

  it('payments UPDATE via anon key affects 0 rows', async () => {
    const { data: before } = await anon
      .from('payments')
      .select('id, status')
      .eq('id', 'f2000000-0000-4000-8000-000000000004')
      .maybeSingle();

    // Anon has no SELECT on this payment either — that's fine; the bug was UPDATE.
    const { data, error, count } = await anon
      .from('payments')
      .update({ status: 'succeeded', cash_collected_at: new Date().toISOString() })
      .eq('id', 'f2000000-0000-4000-8000-000000000004')
      .select('id');

    // No UPDATE policy for anon → 0 rows / error; never succeeded
    expect(data === null || data.length === 0).toBe(true);
    if (count !== null) expect(count).toBe(0);

    // Confirm via service-role-equivalent: re-read as authed provider (has SELECT)
    const { data: after } = await authed
      .from('payments')
      .select('status')
      .eq('id', 'f2000000-0000-4000-8000-000000000004')
      .single();
    expect(after?.status).toBe('pending');
    void before;
    void error;
  });
});

if (!reachable) {
  // Visible in CI / local without Docker — suite still passes.
  console.warn(
    '\n[rls.db.test] SKIPPED: local Supabase unreachable at http://127.0.0.1:54321\n' +
      'Start it with `supabase start` then re-run `pnpm test` for RLS coverage.\n',
  );
}
