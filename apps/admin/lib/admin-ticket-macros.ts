/** Canned support macros for ticket notes / resolution copy. */
export type TicketMacro = {
  id: string;
  label: string;
  body: string;
};

export const TICKET_NOTE_MACROS: readonly TicketMacro[] = [
  {
    id: 'ack',
    label: 'Acknowledge',
    body: 'Thanks for reporting this — we are reviewing the booking details and will update you shortly.',
  },
  {
    id: 'investigate',
    label: 'Investigating',
    body: 'We have contacted the provider and are reviewing job evidence (photos/chat). Expected update within one business day.',
  },
  {
    id: 'full_refund',
    label: 'Full refund issued',
    body: 'A full refund has been issued to the original payment method. Please allow 5–10 business days for it to appear.',
  },
  {
    id: 'partial_refund',
    label: 'Partial refund',
    body: 'A partial refund has been issued as goodwill. The remaining balance stands for the completed work.',
  },
  {
    id: 'rework',
    label: 'Rework offered',
    body: 'We can arrange a free rework visit. Reply with preferred dates and we will match a provider.',
  },
  {
    id: 'credit',
    label: 'Wallet credit',
    body: 'A goodwill credit has been added to your Urban Assist wallet for a future booking.',
  },
  {
    id: 'closed_ok',
    label: 'Resolved OK',
    body: 'Customer confirmed the resolution. Closing this ticket.',
  },
] as const;

export const REFUND_REASON_PRESETS = [
  'Quality issue',
  'Provider no-show',
  'Late / incomplete job',
  'Customer cancellation goodwill',
  'Duplicate charge',
  'Other',
] as const;

/** Remaining refundable amount given captured total and already-refunded pence. */
export function refundablePence(amountPence: number, alreadyRefundedPence: number): number {
  return Math.max(0, amountPence - Math.max(0, alreadyRefundedPence));
}

export function isFullRefund(amountPence: number, refundAmountPence: number): boolean {
  return refundAmountPence >= amountPence;
}
