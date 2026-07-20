// Releases provider earnings for completed, settled bookings.
// Invoke from a trusted scheduler with x-edge-function-secret: EDGE_FUNCTION_SECRET.

// @ts-expect-error Deno globals
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-expect-error Deno remote import
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EDGE_FUNCTION_SECRET = Deno.env.get('EDGE_FUNCTION_SECRET') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
});

interface PayoutClaim {
  payout_id: string;
  provider_id: string;
  amount_pence: number;
  stripe_account_id: string;
  claim_state: 'claimed' | 'processing' | 'paid';
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!isAuthorized(req)) return json({ error: 'unauthorized' }, 401);
  if (!STRIPE_SECRET_KEY) return json({ error: 'stripe_not_configured' }, 503);

  const body = await req.json().catch(() => ({}));
  const bookingId = typeof body.booking_id === 'string' ? body.booking_id : null;
  if (bookingId) {
    if (!isUuid(bookingId)) return json({ error: 'invalid_booking_id' }, 400);
    const result = await releaseBooking(bookingId);
    return json(result.body, result.status);
  }

  const { data: completed, error } = await db
    .from('bookings')
    .select('id')
    .eq('status', 'completed')
    .order('completed_at', { ascending: true })
    .limit(50);
  if (error) return json({ error: 'release_queue_failed' }, 500);

  const results = await Promise.all((completed ?? []).map(({ id }) => releaseBooking(id)));
  return json({
    scanned: completed?.length ?? 0,
    released: results.filter((result) => result.body.status === 'paid').length,
    processing: results.filter((result) => result.body.status === 'processing').length,
    skipped: results.filter((result) => result.status >= 400).length,
  });
});

async function releaseBooking(
  bookingId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { data, error } = await db.rpc('claim_booking_payout', {
    p_booking_id: bookingId,
  });
  if (error) {
    const message = error.message.includes('provider_stripe_account_missing')
      ? 'provider_stripe_account_missing'
      : 'payout_not_eligible';
    return { status: 409, body: { error: message, booking_id: bookingId } };
  }

  const claim = (data?.[0] ?? null) as PayoutClaim | null;
  if (!claim) return { status: 500, body: { error: 'payout_claim_failed' } };
  if (claim.claim_state === 'paid') {
    return { status: 200, body: { booking_id: bookingId, status: 'paid', idempotent: true } };
  }
  if (claim.claim_state === 'processing') {
    return { status: 202, body: { booking_id: bookingId, status: 'processing' } };
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: claim.amount_pence,
        currency: 'gbp',
        destination: claim.stripe_account_id,
        metadata: { booking_id: bookingId, payout_id: claim.payout_id },
      },
      { idempotencyKey: `urban-assist:booking:${bookingId}:payout:v1` },
    );

    const { error: updateError } = await db
      .from('payouts')
      .update({
        stripe_transfer_id: transfer.id,
        status: 'paid',
        updated_at: new Date().toISOString(),
        lease_expires_at: null,
        failure_reason: null,
      })
      .eq('id', claim.payout_id)
      .eq('status', 'pending');
    if (updateError) throw updateError;

    await db.from('notifications').insert({
      profile_id: claim.provider_id,
      type: 'payment.released',
      payload: {
        booking_id: bookingId,
        payout_id: claim.payout_id,
        amount_pence: claim.amount_pence,
      },
    });

    return {
      status: 200,
      body: {
        booking_id: bookingId,
        payout_id: claim.payout_id,
        transfer_id: transfer.id,
        amount_pence: claim.amount_pence,
        status: 'paid',
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'stripe_transfer_failed';
    await db
      .from('payouts')
      .update({
        status: 'failed',
        failure_reason: reason.slice(0, 500),
        updated_at: new Date().toISOString(),
        lease_expires_at: null,
      })
      .eq('id', claim.payout_id)
      .eq('status', 'pending');
    return { status: 502, body: { error: 'stripe_transfer_failed', booking_id: bookingId } };
  }
}

function isAuthorized(req: Request): boolean {
  const secret = req.headers.get('x-edge-function-secret') ?? '';
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return Boolean(
    (EDGE_FUNCTION_SECRET && secret === EDGE_FUNCTION_SECRET) ||
      (SERVICE_ROLE_KEY && bearer === SERVICE_ROLE_KEY),
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
