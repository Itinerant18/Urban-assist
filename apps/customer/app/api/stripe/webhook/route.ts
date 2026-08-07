// Stripe webhook — settles card payments when the PaymentIntent succeeds.
// Configure Stripe CLI forwarding to /api/stripe/webhook on the customer app.
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { stripe } from '@urban-assist/integrations/stripe';
import { track } from '@urban-assist/domain/analytics';
import { createServiceRole } from '@urban-assist/db/server';

export const runtime = 'nodejs';

const UNIQUE_VIOLATION = '23505';

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

  // Claim the event before doing any work. Stripe retries on non-2xx and the
  // dashboard can replay by hand, so without this the side effects below run
  // more than once per event.
  const { error: claimErr } = await db
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, type: event.type });

  if (claimErr) {
    if (claimErr.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ received: true, deduped: true });
    }
    // Could not record the claim — fail so Stripe retries rather than
    // processing an event we cannot prove we only handled once.
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }

  try {
    await handleEvent(db, event);
  } catch (err: any) {
    // Release the claim so Stripe's retry is not silently deduped into a no-op.
    await db.from('stripe_webhook_events').delete().eq('event_id', event.id);
    return NextResponse.json({ error: err?.message ?? 'handler_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(db: ReturnType<typeof createServiceRole>, event: any) {
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any;
    const bookingId = pi.metadata?.booking_id;
    if (bookingId) {
      await db
        .from('payments')
        .update({ status: 'succeeded' })
        .eq('stripe_payment_intent_id', pi.id);
      await track(db, pi.metadata?.customer_profile_id ?? null, {
        type: 'payment.succeeded',
        payload: { booking_id: bookingId, amount_pence: pi.amount },
      });
    }
    return;
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any;
    await db
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id);
    return;
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as any;
    const paymentIntentId = charge.payment_intent;
    if (!paymentIntentId) return;

    // Partial refunds leave the payment settled — only a full refund flips status.
    // payment_status has no 'partially_refunded' value, so a partial refund is
    // recorded in the audit log and the payment stays 'succeeded'.
    const fullyRefunded = charge.amount_refunded >= charge.amount;
    if (fullyRefunded) {
      await db
        .from('payments')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId);
    }

    await logPaymentEvent(db, paymentIntentId, fullyRefunded ? 'payment.refunded' : 'payment.partially_refunded', {
      charge_id: charge.id,
      amount_pence: charge.amount,
      amount_refunded_pence: charge.amount_refunded,
    });
    return;
  }

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as any;
    const paymentIntentId = dispute.payment_intent;
    if (!paymentIntentId) return;

    // No 'disputed' payment_status exists, and inventing one would need a
    // migration plus admin UI. The audit log is the existing surface for
    // finance staff, so the dispute lands there and payment state is untouched.
    await logPaymentEvent(db, paymentIntentId, 'payment.disputed', {
      dispute_id: dispute.id,
      amount_pence: dispute.amount,
      reason: dispute.reason,
      status: dispute.status,
    });
  }
}

// Resolves the booking behind a PaymentIntent and writes an audit_log row.
// entity_id is not nullable, so an unmatched PaymentIntent is skipped rather
// than logged against a fabricated id.
async function logPaymentEvent(
  db: ReturnType<typeof createServiceRole>,
  paymentIntentId: string,
  action: string,
  newData: Record<string, unknown>,
) {
  const { data: payment } = await db
    .from('payments')
    .select('booking_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (!payment?.booking_id) return;

  await db.from('audit_log').insert({
    actor_id: null,
    action,
    entity_type: 'booking',
    entity_id: payment.booking_id,
    new_data: { ...newData, stripe_payment_intent_id: paymentIntentId },
  });
}
