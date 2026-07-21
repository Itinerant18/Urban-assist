'use client';

import { getMessaging, getToken } from 'firebase/messaging';
import { authenticateFirebase } from './client-app';

// Public web config — safe to expose; the SW reads it from its own query string.
const PUBLIC_CONFIG: Record<string, string> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

export type PushOutcome = 'registered' | 'skipped' | 'denied';

/**
 * Register this browser for FCM web push and store the token via /api/fcm-token.
 * Safe to call on every mount: idempotent, and no-ops when unconfigured
 * (no VAPID key), unsupported, or when the user hasn't granted permission.
 */
export async function registerForPush(): Promise<PushOutcome> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey || !PUBLIC_CONFIG.apiKey) return 'skipped';
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('Notification' in window) ||
    !('PushManager' in window)
  ) {
    return 'skipped';
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'skipped';

  // Narrow scope keeps the FCM worker clear of the app-shell sw.js at '/'.
  // Config travels in the query string so env stays the single source of truth.
  const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams(PUBLIC_CONFIG)}`;
  const registration = await navigator.serviceWorker.register(swUrl, { scope: '/fcm/' });

  const tokenRes = await fetch('/api/firebase/token', { method: 'POST' });
  if (!tokenRes.ok) return 'skipped';
  const { token: customToken } = (await tokenRes.json()) as { token?: string };
  if (!customToken) return 'skipped';

  const { app } = await authenticateFirebase(customToken);
  const fcmToken = await getToken(getMessaging(app), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!fcmToken) return 'skipped';

  await fetch('/api/fcm-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: fcmToken, device: navigator.userAgent.slice(0, 120) }),
  });
  return 'registered';
}
