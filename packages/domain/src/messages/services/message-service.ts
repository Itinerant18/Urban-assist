import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage } from '@urban-assist/types';
import { appendChatMessage } from '@urban-assist/integrations/firebase';

const CHAT_STATUSES = ['assigned', 'on_the_way', 'arrived', 'in_progress', 'completed'];

export async function sendBookingMessage(
  admin: SupabaseClient,
  input: { bookingId: string; senderId: string; content: string },
): Promise<ChatMessage> {
  const content = input.content.trim();
  if (!content || content.length > 2000) throw new Error('invalid_content');

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id, customer_id, provider_id, status')
    .eq('id', input.bookingId)
    .single();
  if (bookingError || !booking) throw new Error('booking_not_found');
  if (!booking.provider_id) throw new Error('chat_unavailable');
  if (input.senderId !== booking.customer_id && input.senderId !== booking.provider_id) {
    throw new Error('forbidden');
  }
  if (!CHAT_STATUSES.includes(booking.status)) throw new Error('chat_unavailable');

  const { data: saved, error: messageError } = await admin
    .from('messages')
    .insert({ booking_id: booking.id, sender_id: input.senderId, content })
    .select('id, booking_id, sender_id, content, created_at')
    .single();
  if (messageError || !saved) throw messageError ?? new Error('message_insert_failed');

  const message: ChatMessage = {
    ...saved,
    customer_id: booking.customer_id,
    provider_id: booking.provider_id,
  };
  await appendChatMessage(message);

  const recipient = input.senderId === booking.customer_id ? booking.provider_id : booking.customer_id;
  await admin.from('notifications').insert({
    profile_id: recipient,
    type: 'message.new',
    payload: { booking_id: booking.id, preview: content.slice(0, 140) },
  });

  return message;
}
