import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { submitReview } from '@urban-assist/domain';

const Schema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const {
    data: { user },
  } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await submitReview(createServiceRole(), {
      bookingId: parsed.data.booking_id,
      userId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'review_submission_failed';
    const status =
      message === 'review_already_submitted' ? 409 : message === 'forbidden' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
