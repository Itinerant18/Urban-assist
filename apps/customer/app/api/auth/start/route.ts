// Start OTP — rate-limited via Upstash if configured.
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { otpRateLimit } from '@urban-assist/integrations/redis';
import { inPhoneE164, normaliseMobile, rateLimitKey, ukPhoneE164 } from '@urban-assist/utils';
import { z } from 'zod';
import { isCustomerRoleAllowed } from '../../../../lib/auth-login';

const TOO_MANY = NextResponse.json(
  { error: 'Too many attempts — try again in a few minutes.' },
  { status: 429 },
);

export async function POST(req: NextRequest) {
  const limiter = otpRateLimit();

  // Was keyed on the raw X-Forwarded-For header, which a client sets freely — so a different
  // value per request meant a different Redis bucket and the 5-per-15-minutes cap did
  // nothing. That is unmetered SMS spend and phone enumeration. rateLimitKey only accepts
  // proxy headers we trust.
  if (limiter) {
    const { success } = await limiter.limit(rateLimitKey(req.headers));
    if (!success) return TOO_MANY.clone();
  }

  const { mode, value, referralCode: rawReferralCode } = (await req.json()) as {
    mode: 'email' | 'phone';
    value: string;
    referralCode?: unknown;
  };
  const referralResult = z.string().trim().max(32).optional().safeParse(rawReferralCode);
  if (!referralResult.success) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
  }
  const referralCode = referralResult.data || undefined;
  if (!value) return NextResponse.json({ error: 'Missing value' }, { status: 400 });

  // STRICTLY phone-only authentication
  if (mode !== 'phone') {
    return NextResponse.json({ error: 'Only phone verification is supported.' }, { status: 400 });
  }

  const phone = normaliseMobile(value);
  const isUK = phone !== null && ukPhoneE164.safeParse(phone).success;
  const isIndia = phone !== null && inPhoneE164.safeParse(phone).success;

  if (!isUK && !isIndia) {
    return NextResponse.json(
      {
        error: 'We only support registration with valid UK (+44) or Indian (+91) mobile numbers at this time.',
      },
      { status: 400 },
    );
  }

  // Role lives against auth.users.phone (digits-only), not profiles.phone —
  // profile phones drift in format AND value, so an .eq() there misses accounts.
  const admin = createServiceRole();
  const { data: existingRole, error: profileLookupError } = await (admin as any).rpc(
    'role_for_phone',
    { p_phone: phone! },
  );

  if (profileLookupError) {
    return NextResponse.json({ error: 'auth_check_failed' }, { status: 503 });
  }

  if (!isCustomerRoleAllowed(existingRole)) {
    return NextResponse.json({ error: 'wrong_app' }, { status: 403 });
  }

  // Second bucket, keyed on the target number. The IP limit above bounds enumeration across
  // many numbers; this one bounds cost and nuisance against a single number even when the
  // caller rotates addresses. Checked after validation so an invalid number cannot burn a
  // real number's allowance.
  if (limiter) {
    const { success } = await limiter.limit(`phone:${phone}`);
    if (!success) return TOO_MANY.clone();
  }

  const db = getSupabaseServer();
  const { error } = await db.auth.signInWithOtp({
    phone: phone!,
    options: {
      shouldCreateUser: true,
      data: referralCode ? { referral_code: referralCode } : undefined,
    },
  });

  if (error) return NextResponse.json({ error: 'otp_send_failed' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
