import { redis } from './client';
import { Redis } from '@upstash/redis';
import {
  searchCacheKey as buildSearchKey,
  offerKey as buildOfferKey,
  notificationPendingKey,
  TTL,
} from './keys';

export { searchCacheKey, offerKey, bookingLockKey, providerOnlineKey, providerLocKey, providerActiveKey, postcodeCacheKey, notificationPendingKey, notificationDispatchedKey, acquireLock, releaseLock } from './keys';

export async function getCached<T>(key: string): Promise<T | null> {
  return (await redis().get<T>(key)) ?? null;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number = TTL.SEARCH_CACHE) {
  await redis().set(key, value, { ex: ttlSeconds });
}

export async function setActiveOffer(
  bookingId: string,
  payload: { offer_id: string; provider_id: string; rank: number },
  ttlSeconds: number,
) {
  await redis().set(buildOfferKey(bookingId), payload, { ex: ttlSeconds });
}

export async function clearActiveOffer(bookingId: string) {
  await redis().del(buildOfferKey(bookingId));
}

export function enqueueNotification(n: {
  id: string;
  profile_id: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  const r = redis();
  if (r instanceof Redis) {
    (r as Redis).lpush(notificationPendingKey, JSON.stringify(n));
  }
}
