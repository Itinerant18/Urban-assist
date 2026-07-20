import type { BookingStatus } from '../domain/booking';

export type BookingStatusActorRole = 'customer' | 'provider' | 'admin' | 'system';

export type BookingStatusEventSource =
  | 'booking'
  | 'matching'
  | 'offer'
  | 'admin'
  | 'provider'
  | 'customer'
  | 'support';

export interface BookingStatusEvent {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string | null;
  status: BookingStatus;
  actor_id: string | null;
  actor_role: BookingStatusActorRole;
  source: BookingStatusEventSource;
  occurred_at: string;
}

export type BookingStatusEventInput = Omit<BookingStatusEvent, 'id' | 'occurred_at'>;
