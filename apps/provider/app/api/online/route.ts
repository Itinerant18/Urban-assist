import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.online !== 'boolean') {
    return NextResponse.json({ error: 'invalid_online_status' }, { status: 400 });
  }
  const { online } = body;
  // is_online/last_seen_at are no longer client-writable — migration 202608020001
  // narrowed the authenticated UPDATE grant on profiles to five presentation columns.
  // The row is still pinned to the caller's own id, so service-role adds no reach.
  const { error } = await createServiceRole()
    .from('profiles')
    .update({ is_online: online, last_seen_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, online });
}
