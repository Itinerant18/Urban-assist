// Start phone OTP for providers — UK mobiles only, rate-limited via Upstash if configured.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { otpRateLimit } from '@urban-assist/integrations/redis';

/** Normalise a UK mobile to E.164: `07123456789` → `+447123456789`. */
function normaliseUkMobile(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, '');
  if (/^\+447\d{9}$/.test(digits)) return digits;
  if (/^447\d{9}$/.test(digits)) return `+${digits}`;
  if (/^07\d{9}$/.test(digits)) return `+44${digits.slice(1)}`;
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = normaliseUkMobile(typeof body?.phone === 'string' ? body.phone : '');
  if (!phone) {
    return NextResponse.json(
      { error: 'Enter a valid UK mobile number (starting 07 or +447).' },
      { status: 400 },
    );
  }

  // Rate limit per phone number (falls back to IP if limiter keys need it).
  const limiter = otpRateLimit();
  if (limiter) {
    const { success } = await limiter.limit(phone);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many attempts — try again in a few minutes.' },
        { status: 429 },
      );
    }
  }

  const db = getSupabaseServer();
  const { error } = await db.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
      // handle_new_user trigger reads this to create the profile with the provider role.
      data: { role: 'provider' },
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, phone });
}
