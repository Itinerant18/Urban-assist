import { redis } from './client';

export const searchCacheKey = (categorySlug: string, postcode: string) =>
  `cache:search:${categorySlug}:${postcode.replace(/\s+/g, '').toUpperCase()}`;

export async function getCached<T>(key: string): Promise<T | null> {
  return (await redis().get<T>(key)) ?? null;
}

export async function setCached<T>(key: string, value: T, ttlSeconds = 60) {
  await redis().set(key, value, { ex: ttlSeconds });
}

export const offerKey = (bookingId: string) => `offer:active:${bookingId}`;

export async function setActiveOffer(
  bookingId: string,
  payload: { offer_id: string; provider_id: string; rank: number },
  ttlSeconds: number,
) {
  await redis().set(offerKey(bookingId), payload, { ex: ttlSeconds });
}

export async function clearActiveOffer(bookingId: string) {
  await redis().del(offerKey(bookingId));
}

import { Redis } from '@upstash/redis';

const NOTIF_PENDING = 'notif:pending';

export function enqueueNotification(n: {
  id: string;
  profile_id: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  const r = redis();
  if (r instanceof Redis) {
    (r as Redis).lpush(NOTIF_PENDING, JSON.stringify(n));
  }
}
