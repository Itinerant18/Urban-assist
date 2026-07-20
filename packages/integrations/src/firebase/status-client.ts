'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { BookingStatusEvent, BookingStatusEventInput } from '@urban-assist/types';

type FirestoreStatusEvent = Omit<BookingStatusEvent, 'id' | 'occurred_at'> & {
  occurred_at?: { toDate?: () => Date } | null;
};

function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length) return getApp();
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error('firebase_client_not_configured');
  }
  return initializeApp(config);
}

function normalizeEvent(id: string, data: FirestoreStatusEvent): BookingStatusEvent {
  return {
    ...(data as BookingStatusEventInput),
    id,
    occurred_at: data.occurred_at?.toDate?.()?.toISOString() ?? new Date(0).toISOString(),
  };
}

export async function subscribeToBookingStatus(options: {
  bookingId: string;
  customToken: string;
  participant: 'customer_id' | 'provider_id';
  onEvents: (events: BookingStatusEvent[]) => void;
}): Promise<Unsubscribe> {
  const app = getFirebaseClientApp();
  await signInWithCustomToken(getAuth(app), options.customToken);
  const db = getFirestore(app);
  const statusQuery = query(
    collection(db, 'status_stream'),
    where('booking_id', '==', options.bookingId),
    where(options.participant, '==', getAuth(app).currentUser?.uid ?? ''),
    orderBy('occurred_at', 'asc'),
  );
  return onSnapshot(statusQuery, (snapshot) => {
    options.onEvents(snapshot.docs.map((doc) => normalizeEvent(doc.id, doc.data() as FirestoreStatusEvent)));
  });
}
