import { NextRequest, NextResponse } from 'next/server';
import { createServiceRole } from '@urban-assist/db/server';
import { expireOfferIfStale } from '@urban-assist/domain/matching';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createServiceRole();
  try {
    const result = await expireOfferIfStale(admin, params.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_expire_offer' }, { status: 400 });
  }
}
