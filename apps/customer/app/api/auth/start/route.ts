// Start OTP — rate-limited via Upstash if configured.
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { otpRateLimit } from '@urban-assist/integrations/redis';

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

  const { mode, value } = (await req.json()) as { mode: 'email' | 'phone'; value: string };
  if (!value) return NextResponse.json({ error: 'Missing value' }, { status: 400 });

  // STRICTLY phone-only authentication
  if (mode !== 'phone') {
    return NextResponse.json({ error: 'Only phone verification is supported.' }, { status: 400 });
  }

  // Validate E.164 prefixes for UK (+44) and India (+91)
  const isUK = value.startsWith('+44') && /^\+447\d{9}$/.test(value);
  const isIndia = value.startsWith('+91') && /^\+91[6-9]\d{9}$/.test(value);

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
    phone: value,
    options: { shouldCreateUser: true },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
