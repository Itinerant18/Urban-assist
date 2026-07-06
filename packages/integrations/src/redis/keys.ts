// Central registry of all Redis keys, TTLs, and builder functions.
// Every module must use these helpers — never construct raw key strings.

import { redis } from './client';
import { Redis } from '@upstash/redis';

// ── TTL constants ──────────────────────────────────────────
export const TTL = {
  SEARCH_CACHE: 60,
  OFFER_ACTIVE: 90,
  FCM_TOKEN: 300,
  DISPATCHED_FENCE: 86_400,
  ONLINE_STATUS: 60,
  CONCURRENCY_LOCK: 5,
  PROVIDER_LOC: 300,
  PROVIDER_ACTIVE: 300,
  POSTCODE_CACHE: 86_400,
} as const;

// ── Key builders ───────────────────────────────────────────
export const searchCacheKey = (slug: string, postcode: string) =>
  `cache:search:${slug}:${postcode.replace(/\s+/g, '').toUpperCase()}`;

export const offerKey = (bookingId: string) =>
  `offer:active:${bookingId}`;

export const fcmTokenKey = (profileId: string) =>
  `fcm:tokens:${profileId}`;

export const providerOnlineKey = (profileId: string) =>
  `provider:online:${profileId}`;

export const bookingLockKey = (bookingId: string) =>
  `lock:booking:${bookingId}`;

export const providerLocKey = (profileId: string) =>
  `provider:loc:${profileId}`;

export const providerActiveKey = (categoryId: string) =>
  `provider:active:${categoryId}`;

export const postcodeCacheKey = (postcode: string) =>
  `cache:postcode:${postcode.replace(/\s+/g, '').toUpperCase()}`;

export const notificationPendingKey = 'notif:pending';
export const notificationDispatchedKey = 'notif:dispatched';

// ── Higher-level functions ─────────────────────────────────

export async function acquireLock(
  key: string,
  ttl = TTL.CONCURRENCY_LOCK,
): Promise<boolean> {
  const r = redis();
  if (!(r instanceof Redis)) return true; // shim — skip lock
  const ok = await (r as Redis).set(key, '1', {
    nx: true,
    ex: ttl,
  });
  return ok === 'OK';
}

export async function releaseLock(key: string) {
  const r = redis();
  if (r instanceof Redis) {
    await (r as Redis).del(key);
  }
}
