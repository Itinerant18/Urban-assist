import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { listPendingKyc } from '@urban-assist/domain';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getSupabaseServer();
    const data = await listPendingKyc(db);
    return NextResponse.json(data);
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
