import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }

  const sessionDb = getSupabaseServer();
  const { data, error } = await sessionDb.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const adminDb = createServiceRole();
  const { data: profile, error: profileError } = await adminDb
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    await sessionDb.auth.signOut();
    return NextResponse.json({ error: 'This account does not have admin access.' }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
