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
import type { ChatMessage } from '@urban-assist/types';
import { authenticateFirebase } from './client-app';

export async function subscribeToBookingChat(options: {
  bookingId: string;
  customToken: string;
  participant: 'customer_id' | 'provider_id';
  onMessages: (messages: ChatMessage[]) => void;
}): Promise<Unsubscribe> {
  const { app, uid } = await authenticateFirebase(options.customToken);
  const messagesQuery = query(
    collection(getFirestore(app), 'chat_messages'),
    where('booking_id', '==', options.bookingId),
    where(options.participant, '==', uid),
    orderBy('created_at', 'asc'),
  );
  return onSnapshot(messagesQuery, (snapshot) => {
    options.onMessages(snapshot.docs.map((doc) => doc.data() as ChatMessage));
  });
}
