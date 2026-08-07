// Stripe webhook — settles card payments when the PaymentIntent succeeds.
// Configure Stripe CLI forwarding to /api/stripe/webhook on the customer app.
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { stripe } from '@urban-assist/integrations/stripe';
import { track } from '@urban-assist/domain/analytics';
import { createServiceRole } from '@urban-assist/db/server';

export const runtime = 'nodejs';

const UNIQUE_VIOLATION = '23505';

// How long an unfinished claim is assumed to still be in flight. Past this, a retry may
// take it over — that is what makes a process killed mid-handler recoverable instead of
// a silently dropped event.
const CLAIM_TAKEOVER_MS = 5 * 60 * 1000;

// Statuses a Stripe event is allowed to move a payment *out of*. Terminal states
// ('succeeded', 'refunded', 'failed') are never regressed, because Stripe does not
// guarantee delivery order: a retried payment_intent.succeeded arriving after a
// charge.refunded must not flip the payment back to succeeded and re-open it for payout.
const NON_TERMINAL = ['pending', 'authorized'];

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no_sig' }, { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'no_secret' }, { status: 500 });

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  const db = createServiceRole();

  const claim = await claimEvent(db, event.id, event.type);
  if (claim === 'already_processed') {
    return NextResponse.json({ received: true, deduped: true });
  }
  if (claim === 'in_flight') {
    // Another attempt holds the claim. 409 (not 200) so Stripe retries rather than
    // recording a success for work that may never complete.
    return NextResponse.json({ error: 'event_in_flight' }, { status: 409 });
  }
  if (claim === 'claim_failed') {
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }

  try {
    await handleEvent(db, event);
  } catch (err: any) {
    // The claim row is deliberately left in place with processed_at still null. It
    // expires into a retryable state after CLAIM_TAKEOVER_MS, so Stripe's retry can
    // pick it up. Deleting it here is what previously made an overlapping retry
    // unrecoverable.
    console.error('[stripe-webhook] handler failed', event.id, event.type, err);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }

  const { error: doneErr } = await db
    .from('stripe_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('event_id', event.id);
  if (doneErr) {
    // The work succeeded but the marker did not land. Fail so Stripe retries; the
    // handler's own guards make a second run a no-op.
    console.error('[stripe-webhook] could not mark processed', event.id, doneErr);
    return NextResponse.json({ error: 'mark_processed_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type ClaimResult = 'claimed' | 'already_processed' | 'in_flight' | 'claim_failed';

async function claimEvent(
  db: ReturnType<typeof createServiceRole>,
  eventId: string,
  type: string,
): Promise<ClaimResult> {
  const { error } = await db.from('stripe_webhook_events').insert({ event_id: eventId, type });
  if (!error) return 'claimed';
  if (error.code !== UNIQUE_VIOLATION) {
    console.error('[stripe-webhook] claim insert failed', eventId, error);
    return 'claim_failed';
  }

  const { data: existing, error: readErr } = await db
    .from('stripe_webhook_events')
    .select('processed_at, received_at')
    .eq('event_id', eventId)
    .maybeSingle();
  if (readErr || !existing) {
    console.error('[stripe-webhook] claim re-read failed', eventId, readErr);
    return 'claim_failed';
  }
  if (existing.processed_at) return 'already_processed';

  const age = Date.now() - new Date(existing.received_at).getTime();
  if (age < CLAIM_TAKEOVER_MS) return 'in_flight';

  // Stale claim: take it over by bumping received_at, conditioned on the value we read
  // so only one concurrent attempt wins.
  const { data: taken, error: takeErr } = await db
    .from('stripe_webhook_events')
    .update({ received_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('received_at', existing.received_at)
    .is('processed_at', null)
    .select('event_id')
    .maybeSingle();
  if (takeErr) {
    console.error('[stripe-webhook] claim takeover failed', eventId, takeErr);
    return 'claim_failed';
  }
  return taken ? 'claimed' : 'in_flight';
}

async function handleEvent(db: ReturnType<typeof createServiceRole>, event: any) {
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any;
    const bookingId = pi.metadata?.booking_id;
    if (!bookingId) return;

    // Tips go straight to the provider via Connect and have no `payments` row
    // (api/tips/route.ts creates none). Treating them as booking payments made the
    // update below match zero rows and recorded the tip amount as a booking payment in
    // analytics. Keep them on their own event type.
    if (pi.metadata?.is_tip === 'true') {
      await track(db, pi.metadata?.customer_profile_id ?? null, {
        type: 'tip.succeeded',
        payload: { booking_id: bookingId, amount_pence: pi.amount },
      } as any);
      return;
    }

    const { error, count } = await db
      .from('payments')
      .update({ status: 'succeeded' }, { count: 'exact' })
      .eq('stripe_payment_intent_id', pi.id)
      .in('status', NON_TERMINAL);
    if (error) throw error;
    // Zero rows means either no payments row exists for this intent, or the payment is
    // already terminal. Neither is an error worth retrying, but both are worth seeing.
    if (!count) {
      console.warn('[stripe-webhook] no non-terminal payment for intent', pi.id);
      return;
    }

    await track(db, pi.metadata?.customer_profile_id ?? null, {
      type: 'payment.succeeded',
      payload: { booking_id: bookingId, amount_pence: pi.amount },
    });
    return;
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any;
    const { error } = await db
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id)
      .in('status', NON_TERMINAL);
    if (error) throw error;
    return;
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as any;
    const paymentIntentId = charge.payment_intent;
    if (!paymentIntentId) return;

    // Partial refunds leave the payment settled: payment_status has no
    // 'partially_refunded' value. NOTE this means the provider is still paid on the
    // full booking price — claim_booking_payout reads bookings.price_pence and does not
    // consult refunds. Tracked as a follow-up; the audit row below is the only signal.
    const fullyRefunded = charge.amount_refunded >= charge.amount;
    if (fullyRefunded) {
      const { error } = await db
        .from('payments')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .eq('status', 'succeeded');
      if (error) throw error;
    }

    await logPaymentEvent(
      db,
      paymentIntentId,
      fullyRefunded ? 'payment.refunded' : 'payment.partially_refunded',
      {
        charge_id: charge.id,
        amount_pence: charge.amount,
        amount_refunded_pence: charge.amount_refunded,
      },
      charge.metadata?.booking_id ?? null,
    );
    return;
  }

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as any;
    const paymentIntentId = dispute.payment_intent;
    if (!paymentIntentId) return;

    // No 'disputed' payment_status exists. Payment state is left alone, so a disputed
    // booking remains payout-eligible — tracked as a follow-up alongside partial refunds.
    await logPaymentEvent(
      db,
      paymentIntentId,
      'payment.disputed',
      {
        dispute_id: dispute.id,
        amount_pence: dispute.amount,
        reason: dispute.reason,
        status: dispute.status,
      },
      dispute.metadata?.booking_id ?? null,
    );
  }
}

// Resolves the booking behind a PaymentIntent and writes an audit_log row.
// entity_id is not nullable, so the booking id is resolved from the payments row and,
// failing that, from the Stripe object's metadata — tips have no payments row, and a
// refunded or disputed tip must still be recorded somewhere.
async function logPaymentEvent(
  db: ReturnType<typeof createServiceRole>,
  paymentIntentId: string,
  action: string,
  newData: Record<string, unknown>,
  fallbackBookingId: string | null,
) {
  const { data: payment, error: readErr } = await db
    .from('payments')
    .select('booking_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (readErr) throw readErr;

  const bookingId = payment?.booking_id ?? fallbackBookingId;
  if (!bookingId) {
    // Refusing silently here is how a chargeback disappears. Throw so the event stays
    // unprocessed, Stripe retries, and the failure is visible in logs.
    throw new Error(`cannot resolve booking for ${action} on intent ${paymentIntentId}`);
  }

  const { error } = await db.from('audit_log').insert({
    actor_id: null,
    action,
    entity_type: 'booking',
    entity_id: bookingId,
    new_data: { ...newData, stripe_payment_intent_id: paymentIntentId },
  });
  if (error) throw error;
}
