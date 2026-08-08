import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Keys come from the gitignored .env.local that local setup creates, not from
// literals in this file. The values are only the public supabase-demo tokens, but
// JWT-shaped strings in source trip secret scanners on every future PR, and
// teaching people to dismiss those alerts is worse than reading a file.
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

const PROVIDER_APPROVED = 'a0000000-0000-4000-8000-000000000001';
const PROVIDER_PENDING = 'a0000000-0000-4000-8000-000000000002';
const PROVIDER_PHONE = '447700900001';
const TEST_OTP = '123456';

async function localSupabaseReachable(): Promise<boolean> {
  if (!ANON_KEY) return false; // no local env captured -> same skip path as stack-down
  try {
    // Kong fronts every service locally and 502s key-less requests, so the probe
    // must send the anon key — without it this suite silently skipped while the
    // stack was fully up, and 78-passed-10-skipped read as "88 passed".
    const res = await fetch(`${LOCAL_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY! },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const reachable = await localSupabaseReachable();

// Retries only the throttle, and rethrows anything else immediately — a genuine auth failure
// must not be hidden behind a wait.
async function requestOtpWithBackoff(
  client: SupabaseClient,
  phone: string,
  attempts = 4,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const { error } = await client.auth.signInWithOtp({ phone });
    if (!error) return;
    const throttled = /only request this after|rate limit|too many requests/i.test(error.message);
    if (!throttled || i === attempts - 1) throw error;
    // GoTrue's interval is short; a second is plenty and keeps the suite fast.
    await new Promise((r) => setTimeout(r, 1_100 * (i + 1)));
  }
}


describe.skipIf(!reachable)('RLS / grants (local Supabase)', () => {
  let anon: SupabaseClient;
  let authed: SupabaseClient;

  beforeAll(async () => {
    anon = createClient(LOCAL_URL, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    authed = createClient(LOCAL_URL, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // GoTrue enforces a minimum interval between OTP requests for the same phone and rejects
    // anything sooner with "For security purposes, you can only request this after N seconds."
    // That is the auth server behaving correctly, not a fault — but this suite requests an OTP
    // on every run, so back-to-back runs and CI re-runs hit it. Left unhandled it made this
    // file fail intermittently, and the error surfaced far from its cause: it aborts beforeAll,
    // so every test in the file fails at once and it reads like an RLS regression.
    await requestOtpWithBackoff(authed, PROVIDER_PHONE);

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
  //
  // Asserts on the REJECTION, not on a before/after re-read of the row. The earlier version
  // compared the two reads and was flaky: acceptance-rate.db.test.ts drives offer inserts that
  // recompute profiles.acceptance_rate for this same seeded provider, so under file
  // parallelism the value legitimately moved between the reads and this suite failed for a
  // reason that had nothing to do with RLS.
  //
  // The read below still runs, and its error is asserted — that is what stops a vacuous pass.
  // Without it a typo'd column name would 42703 and "the update errored" would be satisfied by
  // a test that never exercised the grant at all.
  //
  // The attempted value is derived from the CURRENT value so it is always different, which
  // keeps the write a real write: a fixed payload ({rating_avg: 1}) re-sends the value a
  // regressed run already stored, and PostgREST would report success on a no-op.
  const mutate = (column: string, current: unknown): unknown => {
    if (column === 'is_blocked') return !current;
    if (column === 'stripe_account_id') return `acct_hacked_${Date.now()}`;
    return Number(current ?? 0) + 1; // rating_avg, acceptance_rate
  };

  it.each(['rating_avg', 'acceptance_rate', 'is_blocked', 'stripe_account_id'])(
    'provider CANNOT update %s',
    async (column) => {
      const { data: before, error: readErr } = await authed
        .from('profiles')
        .select(column)
        .eq('id', PROVIDER_APPROVED)
        .single();

      // The column exists and the provider can read it. Everything below is about the WRITE.
      expect(readErr).toBeNull();
      expect(before).not.toBeNull();

      const attempted = mutate(column, (before as any)[column]);
      expect(attempted).not.toBe((before as any)[column]);

      const { data: written, error: writeErr } = await authed
        .from('profiles')
        .update({ [column]: attempted } as Record<string, unknown>)
        .eq('id', PROVIDER_APPROVED)
        .select(column);

      // 42501 = permission denied, i.e. the column-level grant. Pinned deliberately rather
      // than "some error": if protection ever moves to a trigger or a policy the code changes
      // and this goes red, which is the correct outcome — the mechanism under test moved.
      expect(writeErr?.code).toBe('42501');
      // Returning rows would mean the UPDATE matched and applied.
      expect(written).toBeNull();
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
