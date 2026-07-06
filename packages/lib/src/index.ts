// Backward-compat re-exports. New code should import from @urban-assist/utils,
// @urban-assist/domain/pricing, or @urban-assist/integrations/postcode directly.
export { pence, ukDate, ukDateTime, miles, formatUkPhone, UK_POSTCODE_RE, getBookingOtp, OFFER_TTL_SECONDS, VAT_RATE } from '@urban-assist/utils';
export { quote } from '@urban-assist/domain/pricing';
export type { PriceQuote, Promo } from '@urban-assist/domain/pricing';
export { lookupPostcode } from '@urban-assist/integrations/postcode';
export type { PostcodeResult } from '@urban-assist/integrations/postcode';
