import type { SupabaseClient } from '@supabase/supabase-js';

export type AnalyticsEvent =
  | { type: 'booking.created'; payload: { booking_id: string } }
  | { type: 'offer.sent'; payload: { booking_id: string; provider_id: string; rank: number } }
  | { type: 'offer.accepted'; payload: { booking_id: string; provider_id: string } }
  | { type: 'offer.declined'; payload: { booking_id: string; provider_id: string } }
  | {
      type: 'offer.blocked_training';
      payload: { booking_id: string; provider_id: string; category_id: string | null };
    }
  | { type: 'payment.succeeded'; payload: { booking_id: string; amount_pence: number } }
  | { type: 'cash.collected'; payload: { booking_id: string } }
  | { type: 'booking.cancelled'; payload: { booking_id: string; reason: string | null } }
  | { type: 'review.submitted'; payload: { booking_id: string; rating: number } }
  | {
      type: 'training.quiz_passed';
      payload: {
        item_id: string;
        score: number;
        pass_score: number;
        category_id: string | null;
      };
    }
  | {
      type: 'training.quiz_failed';
      payload: {
        item_id: string;
        score: number;
        pass_score: number;
        category_id: string | null;
      };
    };

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
