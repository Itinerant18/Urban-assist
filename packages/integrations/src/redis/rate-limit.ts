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

// Sentry's tunnelRoute ('/monitoring') is an unauthenticated relay by design — the browser
// posts error envelopes to our own origin so ad blockers cannot drop them. There is no SSRF
// (Next anchors the rewrite's `has` regexes, so the destination cannot leave *.sentry.io),
// but without a limit it is an unmetered sink for the Sentry quota: exhaust it and real
// errors stop being recorded.
//
// Generous on purpose. A single page load can legitimately send several envelopes (an error
// plus a pageload transaction plus web vitals), so this is meant to stop abuse, not to
// shape normal traffic.
export function sentryTunnelRateLimit() {
  return limiter('rl:sentry:tunnel', 120, '1 m');
}
