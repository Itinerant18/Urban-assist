'use client';

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
import { authenticateFirebase } from './client-app';

type FirestoreStatusEvent = Omit<BookingStatusEvent, 'id' | 'occurred_at'> & {
  occurred_at?: { toDate?: () => Date } | null;
};

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
  const { app, uid } = await authenticateFirebase(options.customToken);
  const db = getFirestore(app);
  const statusQuery = query(
    collection(db, 'bookings', options.bookingId, 'status_stream'),
    where(options.participant, '==', uid),
    orderBy('occurred_at', 'asc'),
  );
  return onSnapshot(statusQuery, (snapshot) => {
    options.onEvents(snapshot.docs.map((doc) => normalizeEvent(doc.id, doc.data() as FirestoreStatusEvent)));
  });
}
