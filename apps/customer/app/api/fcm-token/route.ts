import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { registerToken } from '@urban-assist/integrations/firebase';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { token, device } = await req.json();
  if (!token) return NextResponse.json({ error: 'no_token' }, { status: 400 });
  await registerToken(db as any, user.id, token, device);
  return NextResponse.json({ ok: true });
}

