import { redis } from './client';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import type { Duration } from '@upstash/ratelimit';

function limiter(prefix: string, max: number, window: Duration) {
  const r = redis();
  if (!(r instanceof Redis)) return null;
  return new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(max, window), prefix });
}

export function bookingCreateRateLimit() {
  return limiter('rl:booking:create', 10, '1 h');
}

export function offerRespondRateLimit() {
  return limiter('rl:offer:respond', 20, '1 h');
}

export function paymentIntentRateLimit() {
  return limiter('rl:payment:intent', 5, '1 h');
}

// Sentry tunnel (apps/*/app/api/monitoring/route.ts). Unauthenticated by design — the
// browser posts error envelopes to our own origin so ad blockers cannot drop them, and the
// public DSN needed to craft one ships in the client bundle. The route pins the destination
// to our own project, so the residual risk is quota exhaustion rather than relaying: burn
// the quota and real errors stop being recorded.
//
// Generous on purpose. One page load legitimately sends several envelopes (an error, a
// pageload transaction, web vitals), so this is meant to stop abuse, not shape normal
// traffic.
export function sentryTunnelRateLimit() {
  return limiter('rl:sentry:tunnel', 120, '1 m');
}

// OTP sends, keyed on the CLIENT IP. Separate from the per-phone budget below because they
// guard different things and cannot share one number: this one bounds enumeration across
// many numbers, so it has to tolerate a real person mistyping their number a few times, and
// it has to tolerate carrier CGNAT where thousands of mobile subscribers share one egress
// address. otpRateLimit()'s 5-per-15-minutes is far too tight for that.
export function otpIpRateLimit() {
  return limiter('rl:otp:ip', 30, '15 m');
}

// OTP sends, keyed on the TARGET phone number. This is where cost abuse actually lives: it
// caps how many messages any single number can be sent regardless of where the requests come
// from, so rotating IP addresses does not help an attacker.
export function otpPhoneRateLimit() {
  return limiter('rl:otp:phone', 5, '15 m');
}
