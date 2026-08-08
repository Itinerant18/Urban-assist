import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/** True when a usable secret key is configured (empty string counts as missing). */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.warn('[homeease] STRIPE_SECRET_KEY missing — Stripe calls will fail');
  }
  // ponytail: '' previously slipped past `??` and sent an empty Bearer header
  _stripe = new Stripe(key || 'sk_test_placeholder', {
    // Moves with the SDK major: stripe 22 types this field as the literal it ships against,
    // so it cannot be left behind without lying to the compiler. This is a two-year jump in
    // API version, which changes server-side response shapes as well as types — see the
    // migration notes on PR #20 for what was checked.
    apiVersion: '2026-07-29.dahlia',
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
export async function refundPaymentIntent(
  paymentIntentId: string,
  amountPence?: number,
  idempotencyKey?: string,
) {
  return stripe().refunds.create(
    {
      payment_intent: paymentIntentId,
      ...(amountPence !== undefined ? { amount: amountPence } : {}),
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
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
