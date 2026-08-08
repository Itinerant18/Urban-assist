// Start OTP — rate-limited via Upstash if configured.
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { otpIpRateLimit, otpPhoneRateLimit } from '@urban-assist/integrations/redis';
import { getClientIp, inPhoneE164, normaliseMobile, ukPhoneE164 } from '@urban-assist/utils';
import { z } from 'zod';
import { isCustomerRoleAllowed } from '../../../../lib/auth-login';

// Built per call rather than cloned from a module-scope response: clone() tees the original's
// body stream and the original lives for the whole function instance, so a flood of 429s
// leaks memory.
function tooManyAttempts() {
  return NextResponse.json(
    { error: 'Too many attempts — try again in a few minutes.' },
    { status: 429 },
  );
}

export async function POST(req: NextRequest) {
  // Keyed on trusted proxy headers only. This was the raw X-Forwarded-For header, which a
  // client sets freely, so a different value per request meant a different Redis bucket and
  // the cap did nothing: unmetered SMS spend and phone enumeration.
  //
  // 30 per 15 minutes, not 5: this bucket has to tolerate a real person mistyping their
  // number and carrier CGNAT, where thousands of mobile subscribers share one egress address.
  // Per-number cost abuse is bounded by the phone bucket further down instead.
  // Only applied when a trusted IP is actually available. rateLimitKey's shared-bucket
  // fallback is right for telemetry but wrong here: if the platform headers were ever absent
  // in production, every signup in the world would contend for one allowance and the flow
  // would break for everyone. Cost abuse is bounded by the per-number bucket below, which
  // always applies, so skipping this one degrades enumeration protection rather than
  // availability.
  const ip = getClientIp(req.headers);
  if (ip) {
    const ipLimiter = otpIpRateLimit();
    if (ipLimiter) {
      const { success } = await ipLimiter.limit(`ip:${ip}`);
      if (!success) return tooManyAttempts();
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

  // Keyed on the target number, and this is the tight one (5 per 15 minutes): it bounds cost
  // and nuisance against a single number even when the caller rotates addresses. Checked
  // after validation, so mistyping a number cannot burn the real number's allowance.
  // normaliseMobile has already canonicalised to E.164, so formatting cannot split buckets.
  const phoneLimiter = otpPhoneRateLimit();
  if (phoneLimiter) {
    const { success } = await phoneLimiter.limit(`phone:${phone}`);
    if (!success) return tooManyAttempts();
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
