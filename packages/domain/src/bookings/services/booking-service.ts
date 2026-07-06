import type { SupabaseClient } from '@supabase/supabase-js';
import { quote } from '@urban-assist/domain/pricing';
import { sendNextOffer } from '@urban-assist/domain/matching';
import { track } from '@urban-assist/domain/analytics';
import { createBookingIntent } from '@urban-assist/integrations/stripe';

export interface CreateBookingInput {
  customerId: string;
  providerServiceId: string;
  addressId: string;
  scheduledAt: string;
  paymentMethod: 'card' | 'cash';
  promoCode?: string | null;
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

  let promo: { id: string; discount_type: 'percent' | 'fixed'; discount_value: number } | null = null;
  if (input.promoCode) {
    const { data: p } = await admin
      .from('promo_codes')
      .select('id, discount_type, discount_value, expires_at')
      .eq('code', input.promoCode.toUpperCase())
      .single();
    if (p && (!p.expires_at || new Date(p.expires_at) > new Date())) {
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

  try {
    await sendNextOffer(admin, booking.id);
  } catch {
    /* cascade failure is non-fatal */
  }

  let clientSecret: string | null = null;
  if (input.paymentMethod === 'card') {
    const pi = await createBookingIntent({
      bookingId: booking.id,
      customerId: input.customerId,
      amountPence: q.total_pence,
      description: `HomeEase booking ${booking.short_code}`,
    });
    await admin.from('payments').insert({
      booking_id: booking.id,
      method: 'card',
      stripe_payment_intent_id: pi.id,
      amount_pence: q.total_pence,
      vat_pence: q.vat_pence,
      status: 'pending',
    });
    clientSecret = pi.client_secret;
  } else {
    await admin.from('payments').insert({
      booking_id: booking.id,
      method: 'cash',
      amount_pence: q.total_pence,
      vat_pence: q.vat_pence,
      status: 'pending',
    });
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

  await sendNextOffer(admin, input.bookingId);
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
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
