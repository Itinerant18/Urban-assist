import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { listProviders } from '@urban-assist/domain';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseServer();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
    const kycFilter = url.searchParams.get('kyc_status') as any;
    const result = await listProviders(db, limit, offset, kycFilter);
    return NextResponse.json(result);
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
