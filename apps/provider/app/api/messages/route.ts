import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { sendBookingMessage } from '@urban-assist/domain/messages';

const Schema = z.object({
  booking_id: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const {
    data: { user },
  } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const message = await sendBookingMessage(createServiceRole(), {
      bookingId: parsed.data.booking_id,
      senderId: user.id,
      content: parsed.data.content,
    });
    return NextResponse.json(message);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'message_send_failed';
    const status = message === 'forbidden' ? 403 : message === 'booking_not_found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
