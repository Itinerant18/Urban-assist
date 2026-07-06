// Both sides confirm cash collection. Booking is marked paid once
// either party flips it (provider in practice; customer can corroborate).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { confirmCashPayment } from '@urban-assist/domain';

const Schema = z.object({ booking_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await confirmCashPayment(getSupabaseServer(), createServiceRole(), {
      bookingId: parsed.data.booking_id,
      userId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 400 });
  }
}

