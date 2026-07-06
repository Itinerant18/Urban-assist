import type { SupabaseClient } from '@supabase/supabase-js';

export type AnalyticsEvent =
  | { type: 'booking.created'; payload: { booking_id: string } }
  | { type: 'offer.sent'; payload: { booking_id: string; provider_id: string; rank: number } }
  | { type: 'offer.accepted'; payload: { booking_id: string; provider_id: string } }
  | { type: 'offer.declined'; payload: { booking_id: string; provider_id: string } }
  | { type: 'payment.succeeded'; payload: { booking_id: string; amount_pence: number } }
  | { type: 'cash.collected'; payload: { booking_id: string } }
  | { type: 'review.submitted'; payload: { booking_id: string; rating: number } };

export async function track(
  db: SupabaseClient,
  profileId: string | null,
  e: AnalyticsEvent,
) {
  try {
    await db.from('analytics_events').insert({
      profile_id: profileId,
      type: e.type,
      payload: e.payload,
    });
  } catch {
    /* analytics must never throw into the main path */
  }
}
