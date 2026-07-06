import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { getTicket, updateTicketStatus } from '@urban-assist/domain';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseServer();
    const data = await getTicket(db, params.id);
    return NextResponse.json(data);
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 404;
    return NextResponse.json({ error: e.message }, { status });
  }
}

const Schema = z.object({
  status: z.enum(['in_review', 'resolved', 'closed']),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseServer();
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    await updateTicketStatus(db, createServiceRole(), params.id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
