/**
 * Which job statuses a provider may move a booking to, from each current status.
 *
 * The lifecycle is strictly forward: no going back to an earlier step, no skipping
 * the arrival/start-code checkpoint, and once in_progress the only exit is completed —
 * a provider cannot cancel work they have already started.
 *
 * Lives in its own dependency-free module because client components import it:
 * booking-service.ts pulls the matching engine, which pulls firebase-admin, and any
 * client bundle that traverses that chain fails to compile on grpc's node builtins.
 * Import via `@urban-assist/domain/job-status` from 'use client' code.
 */
export const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  assigned: ['on_the_way', 'cancelled'],
  on_the_way: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
};

export function canProviderCancel(status: string): boolean {
  return JOB_STATUS_TRANSITIONS[status]?.includes('cancelled') ?? false;
}

/**
 * One booking-status vocabulary for customer, provider and admin.
 *
 * Previously three maps disagreed — `assigned` read "Scheduled/accent" to the
 * customer and "Upcoming/muted" to the provider, so the same booking looked like
 * two different states depending on which app support had open.
 */
export type BookingStatusTone = 'accent' | 'success' | 'danger' | 'muted' | 'warning' | 'ink';

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_TONES: Record<string, BookingStatusTone> = {
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
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function bookingStatusTone(status: string): BookingStatusTone {
  return STATUS_TONES[status] ?? 'muted';
}
