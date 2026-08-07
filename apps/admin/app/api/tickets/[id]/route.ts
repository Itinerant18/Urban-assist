import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { assignTicket, getTicket, updateTicketStatus } from '@urban-assist/domain';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseServer();
    const data = await getTicket(db, params.id);
    return NextResponse.json(data);
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' || e.message === 'mfa_required' ? 401 : 404;
    return NextResponse.json({ error: e.message }, { status });
  }
}

const Schema = z
  .object({
    status: z.enum(['in_review', 'resolved', 'closed']).optional(),
    assigned_to: z.string().uuid().nullable().optional(),
  })
  .refine((body) => body.status !== undefined || body.assigned_to !== undefined, {
    message: 'status or assigned_to is required',
  });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseServer();
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const admin = createServiceRole();
    if (parsed.data.status !== undefined) {
      await updateTicketStatus(db, admin, params.id, parsed.data.status);
    }
    if (parsed.data.assigned_to !== undefined) {
      await assignTicket(db, admin, params.id, parsed.data.assigned_to);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' || e.message === 'mfa_required' ? 401 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
