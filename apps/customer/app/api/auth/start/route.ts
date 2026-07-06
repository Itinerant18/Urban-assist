// Start OTP — rate-limited via Upstash if configured.
import { NextRequest, NextResponse } from 'next/server';
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
  const db = getSupabaseServer();
  const { error } =
    mode === 'email'
      ? await db.auth.signInWithOtp({ email: value, options: { shouldCreateUser: true } })
      : await db.auth.signInWithOtp({ phone: value, options: { shouldCreateUser: true } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

