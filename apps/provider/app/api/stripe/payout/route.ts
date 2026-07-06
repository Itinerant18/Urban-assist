import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { transferToProvider } from '@urban-assist/integrations/stripe';
import { z } from 'zod';

const Schema = z.object({
  amountPence: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await transferToProvider(db, user.id, parsed.data.amountPence);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_payout' }, { status: 400 });
  }
}

