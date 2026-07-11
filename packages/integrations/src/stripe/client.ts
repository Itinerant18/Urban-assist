import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[homeease] STRIPE_SECRET_KEY missing — Stripe calls will fail');
  }
  _stripe = new Stripe(key ?? 'sk_test_placeholder', {
    apiVersion: '2024-06-20',
    typescript: true,
  });
  return _stripe;
}

export interface CreateBookingIntentParams {
  bookingId: string;
  customerId: string;
  amountPence: number;
  description: string;
}

/** Full refund of a payment intent (customer cancellation before service). */
export async function refundPaymentIntent(paymentIntentId: string) {
  return stripe().refunds.create({ payment_intent: paymentIntentId });
}

export async function createBookingIntent(params: CreateBookingIntentParams) {
  return stripe().paymentIntents.create({
    amount: params.amountPence,
    currency: 'gbp',
    description: params.description,
    automatic_payment_methods: { enabled: true },
    metadata: {
      booking_id: params.bookingId,
      customer_profile_id: params.customerId,
    },
  });
}
