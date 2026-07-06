import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { updateJobStatus } from '@urban-assist/domain';

const Schema = z.object({
  status: z.enum(['on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled']),
  cancellation_reason: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await updateJobStatus(getSupabaseServer(), {
      bookingId: params.id,
      providerId: user.id,
      status: parsed.data.status,
      cancellationReason: parsed.data.cancellation_reason,
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
