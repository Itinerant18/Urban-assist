import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { booking_id, content } = await req.json();
  if (!booking_id || !content) return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  const { data, error } = await db
    .from('messages')
    .insert({ booking_id, sender_id: user.id, content })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify the other booking participant. Non-fatal: never block the send.
  // notifications RLS is owner-only, so this insert needs the service role.
  try {
    const { data: b } = await db
      .from('bookings')
      .select('customer_id, provider_id')
      .eq('id', booking_id)
      .single();
    const recipient = b?.customer_id === user.id ? b?.provider_id : b?.customer_id;
    if (recipient) {
      await createServiceRole().from('notifications').insert({
        profile_id: recipient,
        type: 'message.new',
        payload: { booking_id, preview: String(content).slice(0, 140) },
      });
    }
  } catch {
    /* non-fatal */
  }

  return NextResponse.json(data);
}
