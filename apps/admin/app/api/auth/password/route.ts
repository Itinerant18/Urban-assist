import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { requireAdminRole } from '../../../../lib/admin-auth';
import { ROLE_OPTIONS } from '../../../../lib/admin-policy';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  // Full admin + aal2 gate. A bare getUser() here let an MFA-stalled session
  // (aal1 cookie set by /api/auth/login before TOTP verify) rotate the password.
  let actor: { id: string };
  try {
    const { user } = await requireAdminRole(ROLE_OPTIONS.map((r) => r.code));
    actor = user;
  } catch (e: any) {
    const message = e?.message ?? 'unauthorized';
    const status = message === 'forbidden' ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'New password must be at least 12 characters.' },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: 'New password must be different from the current password.' },
      { status: 400 },
    );
  }

  const sessionDb = getSupabaseServer();
  const {
    data: { user },
  } = await sessionDb.auth.getUser();
  if (!user?.email || user.id !== actor.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Confirm caller still knows the current password — on a THROWAWAY client.
  // Doing this on sessionDb replaced the aal2 cookie with a fresh aal1 session,
  // silently logging the admin out on their next navigation.
  const throwaway = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: verifyError } = await throwaway.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });
  }
  await throwaway.auth.signOut().catch(() => {});

  const { error: updateError } = await sessionDb.auth.updateUser({ password: newPassword });
  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'Unable to update password.' },
      { status: 400 },
    );
  }

  // Best-effort audit — password change is a trust-boundary event.
  try {
    const adminDb = createServiceRole() as any;
    await adminDb.rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: null,
      p_action_type: 'PASSWORD_CHANGE',
      p_entity_type: 'admin_user',
      p_entity_id: user.id,
      p_context: { via: 'self_serve' },
    });
  } catch (err) {
    // ponytail: audit failure must not roll back a successful password change
    console.error('[password] audit log failed', err);
  }

  return NextResponse.json({ ok: true });
}
