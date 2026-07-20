import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createFirebaseCustomToken } from '@urban-assist/integrations/firebase';

export const dynamic = 'force-dynamic';

export async function POST() {
  const {
    data: { user },
  } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    return NextResponse.json({ token: await createFirebaseCustomToken(user.id) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'firebase_token_failed';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
