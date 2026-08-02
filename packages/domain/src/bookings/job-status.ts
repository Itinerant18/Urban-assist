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
