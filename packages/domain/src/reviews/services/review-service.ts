import type { SupabaseClient } from '@supabase/supabase-js';
import { track } from '@urban-assist/domain/analytics';

export interface SubmitReviewInput {
  bookingId: string;
  userId: string;
  rating: number;
  comment?: string | null;
}

export async function submitReview(
  admin: SupabaseClient,
  input: SubmitReviewInput,
): Promise<void> {
  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id, provider_id, status')
    .eq('id', input.bookingId)
    .single();
  if (!booking) throw new Error('booking_not_found');
  if (booking.status !== 'completed') throw new Error('booking_not_completed');

  const isCustomer = booking.customer_id === input.userId;
  const isProvider = booking.provider_id === input.userId;
  if (!isCustomer && !isProvider) throw new Error('forbidden');

  const targetId = isCustomer ? booking.provider_id : booking.customer_id;
  if (!targetId) throw new Error('review_target_missing');
  const direction: 'customer_to_provider' | 'provider_to_customer' = isCustomer
    ? 'customer_to_provider'
    : 'provider_to_customer';

  const { error } = await admin.from('reviews').insert({
    booking_id: booking.id,
    author_id: input.userId,
    target_id: targetId,
    direction,
    rating: input.rating,
    comment: input.comment ?? null,
  });
  if (error) {
    if (error.code === '23505') throw new Error('review_already_submitted');
    if (error.code === '23514') throw new Error('review_not_eligible');
    throw new Error(error.message);
  }

  await admin.from('notifications').insert({
    profile_id: targetId,
    type: 'review.received',
    payload: { booking_id: booking.id, rating: input.rating },
  });

  track(admin, input.userId, {
    type: 'review.submitted',
    payload: { booking_id: booking.id, rating: input.rating },
  });
}
