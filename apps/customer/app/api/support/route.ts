// Self-service support tickets. With no admin inbox in V1,
// a webhook is fired via pg_net trigger on the database level.
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';

const Schema = z.object({
  booking_id: z.string().uuid().optional().nullable(),
  category: z.string().min(2).max(60),
  description: z.string().min(10).max(2000),
  evidence_url: z.string().url().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await db
    .from('support_tickets')
    .insert({
      raised_by: user.id,
      booking_id: parsed.data.booking_id ?? null,
      category: parsed.data.category,
      description: parsed.data.description,
      evidence_url: parsed.data.evidence_url ?? null,
    })
    .select()
    .single();
    
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Webhook is now handled by Edge Function via pg_net database trigger
  return NextResponse.json(data);
}
