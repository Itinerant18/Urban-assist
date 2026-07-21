import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { getAdminMembership } from '../../../../lib/admin-login';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }

  const sessionDb = getSupabaseServer();
  const { data, error } = await sessionDb.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  try {
    await getAdminMembership(data.user.id);
  } catch {
    await sessionDb.auth.signOut();
    return NextResponse.json({ error: 'This account does not have admin access.' }, { status: 403 });
  }

  const { data: factors, error: factorsError } = await sessionDb.auth.mfa.listFactors();
  if (factorsError) {
    await sessionDb.auth.signOut();
    return NextResponse.json({ error: 'Unable to load two-factor authentication.' }, { status: 500 });
  }

  const verifiedFactor = factors.totp.find((factor) => factor.status === 'verified');
  if (verifiedFactor) {
    const { data: challenge, error: challengeError } = await sessionDb.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    });
    if (challengeError) {
      return NextResponse.json({ error: 'Unable to start the two-factor challenge.' }, { status: 500 });
    }
    return NextResponse.json({
      mfa_required: true,
      factor_id: verifiedFactor.id,
      challenge_id: challenge.id,
    });
  }

  // A closed/abandoned enrollment cannot be resumed because Supabase does not
  // return its TOTP secret again. Remove stale unverified factors first.
  await Promise.all(
    factors.all
      .filter((factor) => factor.factor_type === 'totp')
      .filter((factor) => factor.status === 'unverified')
      .map((factor) => sessionDb.auth.mfa.unenroll({ factorId: factor.id })),
  );

  const { data: enrollment, error: enrollmentError } = await sessionDb.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Urban Assist Admin',
  });
  if (enrollmentError) {
    return NextResponse.json({ error: 'Unable to enroll two-factor authentication.' }, { status: 500 });
  }

  return NextResponse.json({
    mfa_enrollment_required: true,
    factor_id: enrollment.id,
    qr_code: enrollment.totp.qr_code,
    secret: enrollment.totp.secret,
  });
}
