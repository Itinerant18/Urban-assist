import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { expireOfferIfStale } from '@urban-assist/domain/matching';

const IdSchema = z.string().uuid();

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = IdSchema.safeParse(params.id);
  if (!id.success) return NextResponse.json({ error: id.error.flatten() }, { status: 400 });

  const admin = createServiceRole();
  try {
    const result = await expireOfferIfStale(admin, id.data);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_expire_offer' }, { status: 400 });
  }
}
