// ponytail: 90s was tuned for the match-cascade tick that expires and re-routes
// offers server-side; that edge function is not deployed yet, so short offers
// just died silently. Drop back toward 90 once the cascade tick is live.
export const OFFER_TTL_SECONDS = 600;
export const VAT_RATE = Number(process.env.NEXT_PUBLIC_VAT_RATE ?? 0.2);

/**
 * Human duration for offer-expiry copy. Every "you have N to accept" string must
 * come from here — help and settings both hardcoded "90 seconds" long after the
 * constant moved to 600, telling providers they had 15% of the time they had.
 */
export function durationLabel(seconds: number): string {
  if (seconds % 60 !== 0 || seconds < 60) return `${seconds} seconds`;
  const mins = seconds / 60;
  return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
}

export const OFFER_TTL_LABEL = durationLabel(OFFER_TTL_SECONDS);

/**
 * The cancellation policy, stated once.
 *
 * This is what `cancelBooking` actually enforces: CANCELLABLE_STATUSES is
 * `pending_match | unmatched | assigned`, with no fee and no time window. Three
 * surfaces used to invent their own version — "free up to 2 hours before", and a
 * cancel dialog claiming a 24-hour window with a £10 charge that nothing in the
 * codebase can levy. Any change to the rule belongs in booking-service.ts first
 * and here second.
 */
export const CANCELLATION_POLICY =
  'Free to cancel any time before your professional sets off. Card payments are refunded in full.';
