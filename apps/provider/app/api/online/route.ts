import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { online } = await req.json();
  // is_online/last_seen_at are not client-writable (202608020001). The row is still
  // pinned to the authenticated user's own id, so service-role grants no extra reach.
  const { error } = await createServiceRole()
    .from('profiles')
    .update({ is_online: !!online, last_seen_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, online: !!online });
}
