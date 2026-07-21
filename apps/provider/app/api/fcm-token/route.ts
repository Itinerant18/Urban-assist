import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { registerToken } from '@urban-assist/integrations/firebase';
import { z } from 'zod';

const Schema = z.object({
  token: z.string().trim().min(1).max(4096),
  device: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_fcm_token' }, { status: 400 });
  }
  const { token, device } = parsed.data;
  await registerToken(db as any, user.id, token, device);
  return NextResponse.json({ ok: true });
}
