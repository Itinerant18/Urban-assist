import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

export const dynamic = 'force-dynamic';

const EmailSchema = z.object({ email: z.string().email() });

// profiles.email is excluded from the client UPDATE grant, so it must be
// written with the service role behind a session-validated route.
export async function POST(req: Request) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = EmailSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });

  const { error } = await createServiceRole()
    .from('profiles')
    .update({ email: parsed.data.email })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  return NextResponse.json({ email: parsed.data.email });
}
