import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { releaseProviderEarnings } from '@urban-assist/integrations/stripe';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    // Release amounts are derived from completed bookings and settled payments.
    // Any legacy amountPence value in the request body is intentionally ignored.
    await req.json().catch(() => null);
    const result = await releaseProviderEarnings(createServiceRole(), user.id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'failed_to_payout';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

