import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { auditAdminLogin, getAdminMembership } from '../../../../../lib/admin-login';

const Schema = z.object({
  factor_id: z.string().min(1),
  challenge_id: z.string().min(1).optional(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter the six-digit authenticator code.' }, { status: 400 });
  }

  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Session expired. Sign in again.' }, { status: 401 });

  try {
    await getAdminMembership(user.id);
  } catch {
    await db.auth.signOut();
    return NextResponse.json({ error: 'This account does not have admin access.' }, { status: 403 });
  }

  let challengeId = parsed.data.challenge_id;
  if (!challengeId) {
    const { data: challenge, error } = await db.auth.mfa.challenge({
      factorId: parsed.data.factor_id,
    });
    if (error) return NextResponse.json({ error: 'Unable to start verification.' }, { status: 400 });
    challengeId = challenge.id;
  }

  const { error } = await db.auth.mfa.verify({
    factorId: parsed.data.factor_id,
    challengeId,
    code: parsed.data.code,
  });
  if (error) return NextResponse.json({ error: 'That authenticator code is invalid.' }, { status: 400 });

  await auditAdminLogin(user.id, request);
  return NextResponse.json({ ok: true });
}

