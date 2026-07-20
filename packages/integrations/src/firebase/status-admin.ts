import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { BookingStatusEventInput } from '@urban-assist/types';

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getServiceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const account = JSON.parse(raw) as FirebaseServiceAccount;
    if (!account.project_id || !account.client_email || !account.private_key) return null;
    return { ...account, private_key: account.private_key.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

function getFirebaseAdminApp(): App | null {
  const account = getServiceAccount();
  if (!account) return null;
  const appName = 'urban-assist-firestore';
  const existing = getApps().find((app) => app.name === appName);
  if (existing) return existing;
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
}

let warnedMissingConfig = false;

/**
 * Append one immutable status event. This function never updates or deletes
 * status_stream documents; the Admin SDK bypasses client Firestore rules.
 */
export async function appendBookingStatus(input: BookingStatusEventInput): Promise<string | null> {
  const app = getFirebaseAdminApp();
  if (!app) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn('[urban-assist] Firebase service account missing — status sync disabled');
    }
    return null;
  }

  try {
    const ref = await getFirestore(app).collection('status_stream').add({
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
