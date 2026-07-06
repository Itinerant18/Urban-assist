export type BookingStatus =
  | 'pending_match'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'unmatched'
  | 'disputed';

export interface Booking {
  id: string;
  short_code: string;
  customer_id: string;
  provider_id: string | null;
  category_id: string;
  provider_service_id: string | null;
  address_id: string;
  scheduled_at: string;
  status: BookingStatus;
  price_pence: number;
  vat_pence: number;
  total_pence: number;
  payment_method: 'card' | 'cash';
  promo_code_id: string | null;
  notes: string | null;
  completion_report: string | null;
  created_at: string;
  matched_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}
