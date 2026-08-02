/** Shared booking status labels + tones for customer list/detail (DESIGN §8). */

export type BookingStatusTone = 'accent' | 'success' | 'danger' | 'muted' | 'warning';

const LABELS: Record<string, string> = {
  pending_match: 'Matching',
  assigned: 'Scheduled',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  unmatched: 'Unmatched',
  disputed: 'Disputed',
};

const TONES: Record<string, BookingStatusTone> = {
  pending_match: 'accent',
  assigned: 'accent',
  on_the_way: 'warning',
  arrived: 'warning',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
  unmatched: 'danger',
  disputed: 'danger',
};

export function bookingStatusLabel(status: string): string {
  return LABELS[status] ?? status.replace(/_/g, ' ');
}

export function bookingStatusTone(status: string): BookingStatusTone {
  return TONES[status] ?? 'muted';
}
