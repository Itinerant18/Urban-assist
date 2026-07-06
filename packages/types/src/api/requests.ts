export interface CreateBookingRequest {
  provider_service_id: string;
  address_id: string;
  scheduled_at: string;
  payment_method: 'card' | 'cash';
  promo_code?: string | null;
  notes?: string | null;
}

export interface CreateReviewRequest {
  booking_id: string;
  rating: number;
  comment?: string | null;
}

export interface CashConfirmRequest {
  booking_id: string;
}

export interface UpdateBookingStatusRequest {
  status: string;
  cancellation_reason?: string | null;
}
