export type PaymentMethod = 'card' | 'cash';
export type PaymentStatus = 'pending' | 'authorized' | 'succeeded' | 'failed' | 'refunded';
export type PayoutStatus = 'pending' | 'paid' | 'failed';

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
