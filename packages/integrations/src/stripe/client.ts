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

/** Refund of a payment intent (full or partial). */
export async function refundPaymentIntent(paymentIntentId: string, amountPence?: number) {
  return stripe().refunds.create({
    payment_intent: paymentIntentId,
    ...(amountPence !== undefined ? { amount: amountPence } : {}),
  });
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

export async function createTipIntent(params: {
  bookingId: string;
  customerId: string;
  providerStripeAccountId: string;
  amountPence: number;
}) {
  return stripe().paymentIntents.create({
    amount: params.amountPence,
    currency: 'gbp',
    description: `Tip for booking #${params.bookingId}`,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: 0,
    transfer_data: {
      destination: params.providerStripeAccountId,
    },
    metadata: {
      booking_id: params.bookingId,
      customer_profile_id: params.customerId,
      is_tip: 'true',
    },
  });
}
