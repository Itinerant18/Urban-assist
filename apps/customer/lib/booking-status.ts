/**
 * Booking status labels + tones.
 *
 * Re-export only — the vocabulary lives in `@urban-assist/domain/job-status` so
 * customer, provider and admin cannot drift apart again.
 */
export {
  bookingStatusLabel,
  bookingStatusTone,
  type BookingStatusTone,
} from '@urban-assist/domain/job-status';
