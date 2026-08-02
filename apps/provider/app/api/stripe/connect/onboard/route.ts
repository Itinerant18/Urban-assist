import { NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { createPayoutOnboardingLink } from '@urban-assist/integrations/stripe';

export async function POST() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const returnUrl = `${appUrl}/earnings`;

  try {
    // createPayoutOnboardingLink writes profiles.stripe_account_id, which is no
    // longer client-writable (202608020001). Scoped to the caller's own user.id.
    const result = await createPayoutOnboardingLink(createServiceRole(), user.id, returnUrl);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_create_link' }, { status: 400 });
  }
}

