import { NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

export const dynamic = 'force-dynamic';

// Helper to check if current user is SuperAdmin
async function checkSuperAdmin() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { isSuper: false, user: null };

  const { data: perms } = await db
    .from('admin_permissions')
    .select('can_manage_admins')
    .eq('profile_id', user.id)
    .single();

  return { isSuper: !!perms?.can_manage_admins, user };
}

export async function GET() {
  try {
    const { isSuper } = await checkSuperAdmin();
    if (!isSuper) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const db = getSupabaseServer();
    // Query admin profiles and join their permissions
    const { data: perms, error } = await db
      .from('admin_permissions')
      .select('*, profile:profiles!inner(full_name, email, role)');

    if (error) throw error;
    return NextResponse.json(perms);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { isSuper } = await checkSuperAdmin();
    if (!isSuper) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { email, password, full_name, permissions } = await req.json();
    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabaseAdmin = createServiceRole();

    // 1. Create auth user with admin metadata.
    // This will trigger profile insertion (role: 'admin') and admin_permissions insertion.
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name },
    });

    if (authError) throw authError;
    if (!authUser.user) throw new Error('Failed to create user');

    // 2. Wait a split second or query the newly created permissions row to update it.
    // Since the database trigger handle_new_admin runs automatically, the row must exist.
    const { data: newPerms, error: permUpdateError } = await supabaseAdmin
      .from('admin_permissions')
      .update({
        can_manage_bookings: !!permissions?.can_manage_bookings,
        can_manage_providers: !!permissions?.can_manage_providers,
        can_manage_users: !!permissions?.can_manage_users,
        can_manage_kyc: !!permissions?.can_manage_kyc,
        can_manage_tickets: !!permissions?.can_manage_tickets,
        can_manage_payments: !!permissions?.can_manage_payments,
        can_manage_promo_codes: !!permissions?.can_manage_promo_codes,
        can_view_audit_log: !!permissions?.can_view_audit_log,
        can_manage_admins: !!permissions?.can_manage_admins,
      })
      .eq('profile_id', authUser.user.id)
      .select()
      .single();

    if (permUpdateError) throw permUpdateError;

    return NextResponse.json(newPerms);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { isSuper } = await checkSuperAdmin();
    if (!isSuper) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { profile_id, permissions } = await req.json();
    if (!profile_id || !permissions) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const db = getSupabaseServer();

    // Update using standard user session client, since super-admin policy allows managing admin_permissions.
    const { data: updated, error } = await db
      .from('admin_permissions')
      .update({
        can_manage_bookings: !!permissions.can_manage_bookings,
        can_manage_providers: !!permissions.can_manage_providers,
        can_manage_users: !!permissions.can_manage_users,
        can_manage_kyc: !!permissions.can_manage_kyc,
        can_manage_tickets: !!permissions.can_manage_tickets,
        can_manage_payments: !!permissions.can_manage_payments,
        can_manage_promo_codes: !!permissions.can_manage_promo_codes,
        can_view_audit_log: !!permissions.can_view_audit_log,
        can_manage_admins: !!permissions.can_manage_admins,
      })
      .eq('profile_id', profile_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
