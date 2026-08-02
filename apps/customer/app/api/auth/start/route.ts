// Start OTP — rate-limited via Upstash if configured.
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { otpRateLimit } from '@urban-assist/integrations/redis';
import { inPhoneE164, normaliseMobile, ukPhoneE164 } from '@urban-assist/utils';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const limiter = otpRateLimit();
  if (limiter) {
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many attempts — try again in a few minutes.' },
        { status: 429 },
      );
    }
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

  const db = getSupabaseServer();
  const { error } = await db.auth.signInWithOtp({
    phone: phone!,
    options: {
      shouldCreateUser: true,
      data: referralCode ? { referral_code: referralCode } : undefined,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
