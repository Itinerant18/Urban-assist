export type ReviewDirection = 'customer_to_provider' | 'provider_to_customer';

export interface Review {
  id: string;
  booking_id: string;
  author_id: string;
  target_id: string;
  direction: ReviewDirection;
  rating: number;
  comment: string | null;
  created_at: string;
}
