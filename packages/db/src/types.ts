// Generated DB types — placeholder.
// Regenerate with: pnpm db:types  (requires `supabase` CLI + linked project)
//
// Until regenerated, we hand-author the minimum surface area the app needs.

export type UserRole = 'customer' | 'provider' | 'admin';
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
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type PaymentMethod = 'card' | 'cash';
export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'succeeded'
  | 'failed'
  | 'refunded';
export type KycStatus = 'pending' | 'approved' | 'rejected';
export type ReviewDirection = 'customer_to_provider' | 'provider_to_customer';
export type TicketStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  rating_avg: number;
  rating_count: number;
  acceptance_rate: number;
  is_online: boolean;
  last_seen_at: string | null;
  stripe_account_id: string | null;
  created_at: string;
  // Provider registration (0009_provider_registration_fields)
  date_of_birth: string | null;
  business_name: string | null;
  nino: string | null;
  utr_number: string | null;
  years_experience: number;
  bio: string | null;
  bank_account_holder_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  travel_radius_miles: number;
  registration_completed: boolean;
}

export interface Address {
  id: string;
  profile_id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  min_price_pence: number;
  max_price_pence: number;
  sort_order: number;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  is_active: boolean;
}

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
  payment_method: PaymentMethod;
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

export interface BookingOffer {
  id: string;
  booking_id: string;
  provider_id: string;
  status: OfferStatus;
  rank: number;
  offered_at: string;
  responds_by: string;
  responded_at: string | null;
  decline_reason: string | null;
}

export interface Payment {
  id: string;
  booking_id: string;
  method: PaymentMethod;
  stripe_payment_intent_id: string | null;
  amount_pence: number;
  vat_pence: number;
  status: PaymentStatus;
  cash_collected_at: string | null;
  created_at: string;
}

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

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  booking_id: string | null;
  raised_by: string;
  category: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface ProviderDocument {
  id: string;
  provider_id: string;
  doc_type: string;
  storage_path: string;
  expires_at: string | null;
  uploaded_at: string;
}
