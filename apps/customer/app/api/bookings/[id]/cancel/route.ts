import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { cancelBooking } from '@urban-assist/domain';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let reason: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.reason === 'string') reason = body.reason.slice(0, 200);
  } catch {
    // no body — reason stays null
  }

  try {
    await cancelBooking(createServiceRole(), {
      bookingId: params.id,
      userId: user.id,
      reason,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'booking_not_found' ? 404 : 400;
    return NextResponse.json({ error: e.message ?? 'failed_to_cancel' }, { status });
  }
}
