import { getFirestore } from 'firebase-admin/firestore';
import type { ChatMessage } from '@urban-assist/types';
import { getFirebaseAdminApp } from './status-admin';

/** Creates one immutable chat document using the durable Supabase message ID. */
export async function appendChatMessage(message: ChatMessage): Promise<boolean> {
  try {
    const app = getFirebaseAdminApp();
    if (!app) return false;
    await getFirestore(app).collection('chat_messages').doc(message.id).create(message);
    return true;
  } catch (error) {
    console.warn('[urban-assist] Firestore chat append failed', error);
    return false;
  }
}
