import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { BookingStatusEventInput } from '@urban-assist/types';
import { createPrivateKey } from 'node:crypto';

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getServiceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  let account: FirebaseServiceAccount;
  try {
    account = JSON.parse(raw) as FirebaseServiceAccount;
  } catch {
    throw new Error('firebase_service_account_json_invalid');
  }
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error('firebase_service_account_invalid');
  }

  const privateKey = `${account.private_key
    .trim()
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n?/g, '\n')}\n`;
  try {
    createPrivateKey(privateKey);
  } catch {
    throw new Error('firebase_private_key_invalid');
  }

  return { ...account, private_key: privateKey };
}

export function getFirebaseAdminApp(): App | null {
  const account = getServiceAccount();
  if (!account) return null;
  const appName = 'urban-assist-firestore';
  const existing = getApps().find((app) => app.name === appName);
  if (existing) return existing;
  try {
    return initializeApp(
      {
        credential: cert({
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: account.private_key,
        }),
        projectId: account.project_id,
      },
      appName,
    );
  } catch (error) {
    const concurrentlyInitialized = getApps().find((app) => app.name === appName);
    if (concurrentlyInitialized) return concurrentlyInitialized;
    throw error;
  }
}

let warnedMissingConfig = false;
let warnedInvalidConfig = false;

/**
 * Append one immutable event below bookings/{bookingId}/status_stream. The
 * Admin SDK bypasses client Firestore rules; browser clients remain read-only.
 */
export async function appendBookingStatus(
  input: BookingStatusEventInput,
  eventId?: string,
): Promise<string | null> {
  let app: App | null;
  try {
    app = getFirebaseAdminApp();
  } catch (error) {
    if (!warnedInvalidConfig) {
      warnedInvalidConfig = true;
      console.warn('[urban-assist] Firebase service account invalid — status sync disabled', error);
    }
    return null;
  }
  if (!app) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn('[urban-assist] Firebase service account missing — status sync disabled');
    }
    return null;
  }

  try {
    const collection = getFirestore(app)
      .collection('bookings')
      .doc(input.booking_id)
      .collection('status_stream');
    const ref = eventId ? collection.doc(eventId) : collection.doc();
    await ref.set({
      ...input,
      occurred_at: FieldValue.serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.warn('[urban-assist] Firestore status append failed', error);
    return null;
  }
}

export async function createFirebaseCustomToken(uid: string): Promise<string> {
  const app = getFirebaseAdminApp();
  if (!app) throw new Error('firebase_not_configured');
  return getAuth(app).createCustomToken(uid, { urban_assist: true });
}
