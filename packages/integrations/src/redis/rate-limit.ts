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
