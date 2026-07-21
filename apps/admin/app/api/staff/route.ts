import { NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

export const dynamic = 'force-dynamic';

// Helper to check if current user is SuperAdmin
async function checkSuperAdmin() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { isSuper: false, user: null };

  const adminDb = createServiceRole();
  const { data: memberships } = await (adminDb as any)
    .from('admin_user_roles')
    .select('admin_roles!inner(code)')
    .eq('user_id', user.id);

  return {
    isSuper: (memberships ?? []).some(
      (membership: any) => membership.admin_roles?.code === 'super_admin',
    ),
    user,
  };
}

function rolesFromInput(roles: unknown, permissions: any): string[] {
  if (Array.isArray(roles)) {
    return Array.from(new Set(roles.filter((role): role is string => typeof role === 'string')));
  }
  if (permissions?.can_manage_admins) return ['super_admin'];
  const mapped = [
    permissions?.can_manage_bookings || permissions?.can_manage_kyc || permissions?.can_manage_providers
      ? 'ops_admin'
      : null,
    permissions?.can_manage_payments || permissions?.can_manage_promo_codes
      ? 'finance_admin'
      : null,
    permissions?.can_manage_tickets || permissions?.can_manage_users
      ? 'support_agent'
      : null,
  ].filter((role): role is string => Boolean(role));
  return mapped.length ? mapped : ['analyst'];
}

function permissionsFromRoles(roles: string[]) {
  const superAdmin = roles.includes('super_admin');
  const ops = superAdmin || roles.includes('ops_admin');
  const finance = superAdmin || roles.includes('finance_admin');
  const support = superAdmin || roles.includes('support_agent');
  return {
    can_manage_bookings: ops,
    can_manage_providers: ops,
    can_manage_users: support,
    can_manage_kyc: ops,
    can_manage_tickets: support,
    can_manage_payments: finance,
    can_manage_promo_codes: finance,
    can_view_audit_log: true,
    can_manage_admins: superAdmin,
  };
}

export async function GET() {
  try {
    const { isSuper } = await checkSuperAdmin();
    if (!isSuper) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const db = createServiceRole();
    const { data: memberships, error } = await (db as any)
      .from('admin_user_roles')
      .select(
        'user_id, admin_roles!inner(code), profile:profiles!admin_user_roles_user_id_fkey(full_name, email, role)',
      );

    if (error) throw error;
    const staff = new Map<string, any>();
    for (const membership of memberships ?? []) {
      const existing = staff.get(membership.user_id) ?? {
        profile_id: membership.user_id,
        profile: membership.profile,
        roles: [],
      };
      existing.roles.push(membership.admin_roles.code);
      staff.set(membership.user_id, existing);
    }
    return NextResponse.json(
      Array.from(staff.values()).map((entry) => ({
        ...entry,
        ...permissionsFromRoles(entry.roles),
      })),
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { isSuper, user } = await checkSuperAdmin();
    if (!isSuper || !user) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { email, password, full_name, permissions, roles } = await req.json();
    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabaseAdmin = createServiceRole();

    // Create the auth user and its profile; explicit memberships are assigned
    // transactionally through set_admin_user_roles below.
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name },
    });

    if (authError) throw authError;
    if (!authUser.user) throw new Error('Failed to create user');

    const roleCodes = rolesFromInput(roles, permissions);
    const { data: assignedRoles, error: permUpdateError } = await (supabaseAdmin as any).rpc(
      'set_admin_user_roles',
      {
        p_target_user_id: authUser.user.id,
        p_role_codes: roleCodes,
        p_actor_user_id: user.id,
      },
    );

    if (permUpdateError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw permUpdateError;
    }

    return NextResponse.json({ profile_id: authUser.user.id, roles: assignedRoles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { isSuper, user } = await checkSuperAdmin();
    if (!isSuper || !user) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { profile_id, permissions, roles } = await req.json();
    if (!profile_id || (!permissions && !roles)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const db = createServiceRole();
    const { data: updated, error } = await (db as any).rpc('set_admin_user_roles', {
      p_target_user_id: profile_id,
      p_role_codes: rolesFromInput(roles, permissions),
      p_actor_user_id: user.id,
    });

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
