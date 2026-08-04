import { NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

export const dynamic = 'force-dynamic';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomCode(): string {
  let code = 'URBAN-';
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// Get-or-create the caller's referral code. The referrals table is
// SELECT-only under RLS, so creation runs with the service role.
export async function POST() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createServiceRole();
  const { data: existing } = await admin
    .from('referrals')
    .select('code')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ code: existing[0].code });
  }

  // Retry once on unique violation (code collision across owners).
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await admin
      .from('referrals')
      .insert({ owner_id: user.id, code: randomCode() })
      .select('code')
      .single();
    if (!error && data) return NextResponse.json({ code: data.code });
  }
  return NextResponse.json({ error: 'could_not_create_code' }, { status: 500 });
}
