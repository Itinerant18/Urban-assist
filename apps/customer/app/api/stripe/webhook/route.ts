// Stripe webhook — settles card payments when the PaymentIntent succeeds.
// Configure: stripe listen --forward-to localhost:3000/api/stripe/webhook
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { stripe } from '@urban-assist/integrations/stripe';
import { track } from '@urban-assist/domain/analytics';
import { createServiceRole } from '@urban-assist/db/server';

export const runtime = 'nodejs';

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
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any;
    await db
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id);
  }

  return NextResponse.json({ received: true });
}

