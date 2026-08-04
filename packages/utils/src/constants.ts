// ponytail: 90s was tuned for the match-cascade tick that expires and re-routes
// offers server-side; that edge function is not deployed yet, so short offers
// just died silently. Drop back toward 90 once the cascade tick is live.
export const OFFER_TTL_SECONDS = 600;
export const VAT_RATE = Number(process.env.NEXT_PUBLIC_VAT_RATE ?? 0.2);
