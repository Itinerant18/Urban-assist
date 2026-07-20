// Backward-compat re-exports. New code should import from @urban-assist/domain or @urban-assist/integrations directly.
export { findCandidates, sendNextOffer, respondToOffer, expireOfferIfStale } from '@urban-assist/domain/matching';
export { track } from '@urban-assist/domain/analytics';
export type { AnalyticsEvent } from '@urban-assist/domain/analytics';
export { verifyProviderDocuments } from '@urban-assist/domain/providers';
export {
  stripe,
  createBookingIntent,
  createPayoutOnboardingLink,
  releaseProviderEarnings,
} from '@urban-assist/integrations/stripe';
export { redis, otpRateLimit, getCached, setCached, setActiveOffer, clearActiveOffer } from '@urban-assist/integrations/redis';
export { registerToken, sendPush } from '@urban-assist/integrations/firebase';
