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

/**
 * Turn push off for this device. Without this the settings toggle would be
 * cosmetic — browser permission cannot be revoked from script, so the only real
 * off-switch is dropping the token the dispatcher sends to.
 *
 * Scoped to the caller's own profile_id as well as the token, so possessing a
 * token string is not enough to unregister someone else's device.
 */
export async function DELETE(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { token } = await req.json().catch(() => ({ token: null }));

  let q = db.from('fcm_tokens').delete().eq('profile_id', user.id);
  // No token supplied: the caller is turning push off everywhere for this account.
  if (token) q = q.eq('token', token);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
