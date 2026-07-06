import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { verifyProviderDocuments } from '@urban-assist/domain/providers';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const result = await verifyProviderDocuments(db, user.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'verification_failed' }, { status: 400 });
  }
}

