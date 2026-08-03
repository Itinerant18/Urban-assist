import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { runQualityAction } from '@/lib/admin-ratings';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  action: z.enum(['warn', 'open_ticket', 'restrict_category']),
  reviewId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await runQualityAction(parsed.data);
    if (!result.ok) {
      const status = result.error === 'Review not found.' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      ticketId: result.ticketId ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'quality_action_failed';
    const status =
      message === 'forbidden' ? 403 : message === 'unauthorized' || message === 'mfa_required' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
