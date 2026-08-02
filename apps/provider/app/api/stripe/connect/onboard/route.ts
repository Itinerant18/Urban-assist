import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { createPayoutOnboardingLink } from '@urban-assist/integrations/stripe';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const returnUrl = new URL('/earnings', req.nextUrl.origin).toString();

  try {
    // createPayoutOnboardingLink writes profiles.stripe_account_id, which migration
    // 202608020001 removed from the authenticated grant. Scoped to the caller's own id.
    const result = await createPayoutOnboardingLink(createServiceRole(), user.id, returnUrl);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_create_link' }, { status: 400 });
  }
}

