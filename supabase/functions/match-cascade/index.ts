// Supabase Edge Function: match-cascade
//
// Safety net that expires offers nobody responded to and lets the cascade move on.
// A provider with the app open expires their own offer from the UI; this covers the
// case where the app is closed.
//
// Triggered by pg_cron every minute:
//   select public.invoke_scheduled_edge_function('/match-cascade?mode=tick');
//
// Deploy: supabase functions deploy match-cascade --no-verify-jwt
//
// ---------------------------------------------------------------------------
// This function used to carry its own full copy of the matching engine: candidate
// scoring, Redis online/location lookups, availability filtering, offer insert and
// notification — ~200 lines duplicating packages/domain/src/matching. The two copies
// drifted: the availability filter (time off + working hours) existed only here, so
// offers created by createBooking, by a decline, or by a UI expiry ignored it while
// offers created by this cron respected it.
//
// It now delegates to the one implementation over HTTP. expireOfferIfStale() re-checks
// staleness server-side and cascades, so this only has to say which offers look due.
// ---------------------------------------------------------------------------

// @ts-expect-error Deno globals
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Base URL of the provider app, which hosts /api/offers/[id]/expire.
const APP_URL = Deno.env.get('PROVIDER_APP_URL') ?? '';

const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

serve(async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'tick';

  if (!APP_URL) {
    // Fail loudly rather than silently doing nothing: a quiet no-op here looks
    // identical to "no offers were due" and would hide a broken cascade for days.
    return json({ error: 'PROVIDER_APP_URL is not set' }, 500);
  }

  if (mode === 'kickoff') {
    // The first offer is sent by createBooking() calling sendNextOffer() directly,
    // so a booking-insert webhook here would be a redundant second cascade racing
    // the first on the same Redis booking lock. Kept as an explicit no-op so any
    // still-configured webhook gets a clear answer instead of a 404.
    return json({ ok: true, skipped: 'first offer is sent by createBooking' });
  }

  const { data: stale, error } = await db
    .from('booking_offers')
    .select('id')
    .eq('status', 'pending')
    .lt('responds_by', new Date().toISOString())
    .limit(100);

  if (error) return json({ error: error.message }, 500);

  let expired = 0;
  const failures: string[] = [];

  for (const offer of stale ?? []) {
    try {
      const res = await fetch(`${APP_URL}/api/offers/${offer.id}/expire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      if (res.ok) expired += 1;
      else failures.push(`${offer.id}: HTTP ${res.status}`);
    } catch (e) {
      failures.push(`${offer.id}: ${e instanceof Error ? e.message : 'fetch failed'}`);
    }
  }

  // Surfaced in function logs; the next tick retries anything still pending.
  return json({ considered: stale?.length ?? 0, expired, failures });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
