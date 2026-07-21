import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { verifyProviderDocuments } from '@urban-assist/domain/providers';

const Schema = z.object({
  bg_consent: z.boolean(),
});

export async function POST(req: Request) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const admin = createServiceRole();
    const { error } = await admin
      .from('profiles')
      .update({ kyc_status: 'pending', bg_consent: parsed.data.bg_consent })
      .eq('id', user.id);
    if (error) throw error;

    const result = await verifyProviderDocuments(db, admin, user.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'verification_failed' }, { status: 400 });
  }
}

