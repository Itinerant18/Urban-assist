import type { SupabaseClient } from '@supabase/supabase-js';
import { quote } from '@urban-assist/domain/pricing';
import { sendNextOffer } from '@urban-assist/domain/matching';
import { track } from '@urban-assist/domain/analytics';
import { createBookingIntent, refundPaymentIntent } from '@urban-assist/integrations/stripe';
import { appendBookingStatus } from '@urban-assist/integrations/firebase';

export interface CreateBookingInput {
  customerId: string;
  providerServiceId: string;
  addressId: string;
  scheduledAt: string;
  paymentMethod: 'card' | 'cash';
  promoCode?: string | null;
  applyWallet?: boolean;
  notes?: string | null;
}

export interface CreateBookingResult {
  booking: any;
  payment: { method: string; clientSecret: string | null };
}

export async function createBooking(
  db: SupabaseClient,
  admin: SupabaseClient,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const { data: svc, error: svcErr } = await admin
    .from('provider_services')
    .select('id, provider_id, category_id, price_pence')
    .eq('id', input.providerServiceId)
    .eq('is_active', true)
    .single();
  if (svcErr || !svc) throw new Error('service_not_found');

  let promo: { id: string; discount_type: 'percent' | 'fixed'; discount_value: number } | null =
    null;
  if (input.promoCode) {
    // Atomically reserves one redemption; returns nothing if expired/exhausted.
    // ponytail: over-counts by one if the booking insert below then fails —
    // acceptable until createBooking is wrapped in a single DB transaction.
    const { data: redeemed } = await admin.rpc('redeem_promo_code', {
      p_code: input.promoCode,
    });
    const p = Array.isArray(redeemed) ? redeemed[0] : redeemed;
    if (p) {
      promo = { id: p.id, discount_type: p.discount_type as any, discount_value: p.discount_value };
    }
  }

  const q = quote(svc.price_pence, promo);

  const { data: booking, error: bErr } = await db
    .from('bookings')
    .insert({
      customer_id: input.customerId,
      category_id: svc.category_id,
      provider_service_id: svc.id,
      address_id: input.addressId,
      scheduled_at: input.scheduledAt,
      status: 'pending_match',
      price_pence: q.subtotal_pence,
      vat_pence: q.vat_pence,
      total_pence: q.total_pence,
      payment_method: input.paymentMethod,
      promo_code_id: promo?.id ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (bErr || !booking) throw new Error(bErr?.message ?? 'insert_failed');

  await appendBookingStatus({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    provider_id: booking.provider_id,
    status: 'pending_match',
    actor_id: input.customerId,
    actor_role: 'customer',
    source: 'booking',
  });

  try {
    await sendNextOffer(admin, booking.id);
  } catch {
    /* cascade failure is non-fatal */
  }

  // Wallet spend happens last, so the failure surface after the debit is only
  // the payment step — which we compensate below. Atomic + capped at the total.
  let walletApplied = 0;
  if (input.applyWallet) {
    const { data } = await admin.rpc('apply_wallet_credit', {
      p_profile_id: input.customerId,
      p_max_pence: q.total_pence,
      p_booking_id: booking.id,
    });
    walletApplied = typeof data === 'number' ? data : 0;
    if (walletApplied > 0) {
      await admin.from('bookings').update({ wallet_applied_pence: walletApplied }).eq('id', booking.id);
    }
  }
  const amountDue = q.total_pence - walletApplied;

  let clientSecret: string | null = null;
  try {
    if (input.paymentMethod === 'card' && amountDue > 0) {
      const pi = await createBookingIntent({
        bookingId: booking.id,
        customerId: input.customerId,
        amountPence: amountDue,
        description: `Urban Assist booking ${booking.short_code}`,
      });
      await admin.from('payments').insert({
        booking_id: booking.id,
        method: 'card',
        stripe_payment_intent_id: pi.id,
        amount_pence: amountDue,
        vat_pence: q.vat_pence,
        status: 'pending',
      });
      clientSecret = pi.client_secret;
    } else {
      // Cash, or fully covered by wallet (amountDue === 0 → nothing to charge).
      await admin.from('payments').insert({
        booking_id: booking.id,
        method: input.paymentMethod,
        amount_pence: amountDue,
        vat_pence: q.vat_pence,
        status: amountDue === 0 ? 'succeeded' : 'pending',
      });
    }
  } catch (e) {
    // Never leave the customer debited for a booking we couldn't set up to pay.
    if (walletApplied > 0) {
      await admin.from('wallet_ledger').insert({
        profile_id: input.customerId,
        amount_pence: walletApplied,
        reason: 'booking_spend_refund',
        booking_id: booking.id,
      });
    }
    throw e;
  }

  track(admin, input.customerId, { type: 'booking.created', payload: { booking_id: booking.id } });

  return { booking, payment: { method: input.paymentMethod, clientSecret } };
}

export interface ConfirmCashPaymentInput {
  bookingId: string;
  userId: string;
}

export async function confirmCashPayment(
  db: SupabaseClient,
  admin: SupabaseClient,
  input: ConfirmCashPaymentInput,
): Promise<void> {
  const { data: payment } = await db
    .from('payments')
    .select('id, booking_id, method, status, bookings!inner(customer_id, provider_id)')
    .eq('booking_id', input.bookingId)
    .single();
  if (!payment) throw new Error('payment_not_found');

  const b = (payment as any).bookings;
  if (input.userId !== b.customer_id && input.userId !== b.provider_id) {
    throw new Error('forbidden');
  }
  if (payment.method !== 'cash') throw new Error('not_cash');

  await db
    .from('payments')
    .update({ status: 'succeeded', cash_collected_at: new Date().toISOString() })
    .eq('id', payment.id);

  track(admin, input.userId, {
    type: 'cash.collected',
    payload: { booking_id: input.bookingId },
  });
}

export interface RetryMatchingInput {
  bookingId: string;
  userId: string;
}

export async function retryMatching(
  db: SupabaseClient,
  admin: SupabaseClient,
  input: RetryMatchingInput,
): Promise<void> {
  const { data: booking, error: getErr } = await admin
    .from('bookings')
    .select('id, customer_id, status')
    .eq('id', input.bookingId)
    .single();
  if (getErr || !booking) throw new Error('booking_not_found');
  if (booking.customer_id !== input.userId) throw new Error('forbidden');

  await admin.from('booking_offers').delete().eq('booking_id', input.bookingId);

  const { error: updateErr } = await admin
    .from('bookings')
    .update({ status: 'pending_match', provider_id: null, matched_at: null })
    .eq('id', input.bookingId);
  if (updateErr) throw new Error(updateErr.message);

  await appendBookingStatus({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    provider_id: null,
    status: 'pending_match',
    actor_id: input.userId,
    actor_role: 'customer',
    source: 'customer',
  });

  await sendNextOffer(admin, input.bookingId);
}

export interface CancelBookingInput {
  bookingId: string;
  userId: string;
  reason?: string | null;
}

/**
 * Customer-initiated cancellation, only before the provider is en route.
 * Card payments that already captured are refunded in full via Stripe.
 */
const CANCELLABLE_STATUSES = ['pending_match', 'unmatched', 'assigned'];

export async function cancelBooking(
  admin: SupabaseClient,
  input: CancelBookingInput,
): Promise<void> {
  const { data: booking, error: getErr } = await admin
    .from('bookings')
    .select('id, customer_id, provider_id, status, scheduled_at')
    .eq('id', input.bookingId)
    .single();
  if (getErr || !booking) throw new Error('booking_not_found');
  if (booking.customer_id !== input.userId) throw new Error('forbidden');
  if (!CANCELLABLE_STATUSES.includes(booking.status)) throw new Error('not_cancellable');

  // Withdraw any outstanding offers so providers stop seeing the job.
  await admin.from('booking_offers').delete().eq('booking_id', input.bookingId);

  const { data: cancelled, error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: input.reason ?? 'customer_cancelled',
    })
    .eq('id', input.bookingId)
    // Guard against a concurrent provider status change between read and write.
    .in('status', CANCELLABLE_STATUSES)
    .select('id')
    .maybeSingle();
  if (updateErr) throw new Error(updateErr.message);
  if (!cancelled) throw new Error('booking_update_conflict');

  await appendBookingStatus({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    provider_id: booking.provider_id,
    status: 'cancelled',
    actor_id: input.userId,
    actor_role: 'customer',
    source: 'customer',
  });

  // Refund captured card payments (minus fee if within 24h).
  const { data: payment } = await admin
    .from('payments')
    .select('id, method, status, stripe_payment_intent_id, amount_pence')
    .eq('booking_id', input.bookingId)
    .single();
  if (
    payment?.method === 'card' &&
    ['succeeded', 'authorized'].includes(payment.status) &&
    payment.stripe_payment_intent_id
  ) {
    const scheduledTime = new Date(booking.scheduled_at).getTime();
    const timeDiff = scheduledTime - Date.now();
    const within24Hours = timeDiff < 24 * 60 * 60 * 1000;

    if (within24Hours) {
      const feePence = 1000; // £10.00 fee
      const refundAmount = payment.amount_pence - feePence;
      if (refundAmount > 0) {
        await refundPaymentIntent(payment.stripe_payment_intent_id, refundAmount);
        await admin.from('payments').update({ status: 'refunded' }).eq('id', payment.id);
      } else {
        // Fee eats entire amount; status remains succeeded
      }
    } else {
      await refundPaymentIntent(payment.stripe_payment_intent_id);
      await admin.from('payments').update({ status: 'refunded' }).eq('id', payment.id);
    }
  }

  track(admin, input.userId, {
    type: 'booking.cancelled',
    payload: { booking_id: input.bookingId, reason: input.reason ?? null },
  });

  // Tell the assigned provider their job is gone.
  if (booking.provider_id) {
    await admin.from('notifications').insert({
      profile_id: booking.provider_id,
      type: 'booking.cancelled',
      payload: { booking_id: input.bookingId },
    });
  }
}

export interface RescheduleBookingInput {
  bookingId: string;
  userId: string;
  scheduledAt: string;
}

// ponytail: reschedule only before a provider is attached — changing the time
// under an assigned provider needs a consent loop we don't have yet. Assigned
// customers cancel (free, full refund) and rebook instead.
const RESCHEDULABLE_STATUSES = ['pending_match', 'unmatched'];

export async function rescheduleBooking(
  admin: SupabaseClient,
  input: RescheduleBookingInput,
): Promise<void> {
  const when = new Date(input.scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
    throw new Error('invalid_time');
  }

  const { data: booking, error: getErr } = await admin
    .from('bookings')
    .select('id, customer_id, status')
    .eq('id', input.bookingId)
    .single();
  if (getErr || !booking) throw new Error('booking_not_found');
  if (booking.customer_id !== input.userId) throw new Error('forbidden');
  if (!RESCHEDULABLE_STATUSES.includes(booking.status)) throw new Error('not_reschedulable');

  const { data: rescheduled, error: updateErr } = await admin
    .from('bookings')
    .update({ status: 'pending_match', scheduled_at: when.toISOString() })
    .eq('id', input.bookingId)
    .in('status', RESCHEDULABLE_STATUSES)
    .select('id')
    .maybeSingle();
  if (updateErr) throw new Error(updateErr.message);
  if (!rescheduled) throw new Error('booking_update_conflict');

  if (booking.status === 'unmatched') {
    await appendBookingStatus({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      provider_id: null,
      status: 'pending_match',
      actor_id: input.userId,
      actor_role: 'customer',
      source: 'customer',
    });
  }

  // Unmatched bookings re-enter the matching queue at the new time.
  if (booking.status === 'unmatched') {
    await admin.from('booking_offers').delete().eq('booking_id', input.bookingId);
    await sendNextOffer(admin, input.bookingId);
  }
}

export interface UpdateJobStatusInput {
  bookingId: string;
  providerId: string;
  status: 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  cancellationReason?: string | null;
}

export async function updateJobStatus(
  db: SupabaseClient,
  input: UpdateJobStatusInput,
): Promise<any> {
  const { data: current, error: currentError } = await db
    .from('bookings')
    .select('status, provider_id')
    .eq('id', input.bookingId)
    .single();
  if (currentError || !current) throw new Error('booking_not_found');
  if (current.provider_id !== input.providerId) throw new Error('forbidden');

  const transitions: Record<string, string[]> = {
    assigned: ['on_the_way', 'cancelled'],
    on_the_way: ['arrived', 'cancelled'],
    arrived: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
  };
  if (!transitions[current.status]?.includes(input.status))
    throw new Error('invalid_status_transition');

  const patch: Record<string, any> = { status: input.status };
  const now = new Date().toISOString();
  if (input.status === 'in_progress') patch.started_at = now;
  if (input.status === 'completed') patch.completed_at = now;
  if (input.status === 'cancelled') {
    patch.cancelled_at = now;
    patch.cancellation_reason = input.cancellationReason ?? null;
  }

  const { data, error } = await db
    .from('bookings')
    .update(patch)
    .eq('id', input.bookingId)
    .eq('provider_id', input.providerId)
    .eq('status', current.status)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await appendBookingStatus({
    booking_id: data.id,
    customer_id: data.customer_id,
    provider_id: data.provider_id,
    status: data.status,
    actor_id: input.providerId,
    actor_role: 'provider',
    source: 'provider',
  });
  return data;
}
