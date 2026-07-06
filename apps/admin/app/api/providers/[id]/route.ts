import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { getProvider } from '@urban-assist/domain';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseServer();
    const data = await getProvider(db, params.id);
    return NextResponse.json(data);
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 404;
    return NextResponse.json({ error: e.message }, { status });
  }
}
