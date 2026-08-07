import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { permissionsFromRoles } from '@/lib/admin-policy';

export const dynamic = 'force-dynamic';

const RoleSchema = z.enum([
  'super_admin',
  'ops_admin',
  'finance_admin',
  'support_agent',
  'analyst',
]);
const PermissionsSchema = z.object({}).passthrough();
const PostSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  full_name: z.string().min(1),
  roles: z.array(RoleSchema).optional(),
  permissions: PermissionsSchema.optional(),
});
const PatchSchema = z
  .object({
    profile_id: z.string().uuid(),
    roles: z.array(RoleSchema).optional(),
    permissions: PermissionsSchema.optional(),
  })
  .refine((body) => body.roles !== undefined || body.permissions !== undefined, {
    message: 'roles or permissions is required',
  });

// Helper to check if current user is SuperAdmin
async function checkSuperAdmin() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { isSuper: false, user: null };

  // /api/auth/login sets the session cookie on a correct password and only THEN
  // returns mfa_required, so a bare getUser() here is satisfied by an aal1 session
  // that never passed TOTP. This route creates admin users and assigns admin roles,
  // so it must require aal2 the same way requireAdminRole does (lib/admin-auth.ts).
  // Same class of bug as the one already fixed in api/auth/password/route.ts.
  const { data: assurance, error: assuranceError } =
    await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== 'aal2') {
    return { isSuper: false, user: null };
  }

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

    // Workload: live assigned tickets + how active they've been this week.
    const ids = Array.from(staff.keys());
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [assigned, actions] = await Promise.all([
      db
        .from('support_tickets')
        .select('assigned_to')
        .in('assigned_to', ids)
        .in('status', ['open', 'in_review']),
      db.from('audit_log').select('actor_id').in('actor_id', ids).gte('created_at', since),
    ]);
    const openTickets = new Map<string, number>();
    for (const row of assigned.data ?? []) {
      if (row.assigned_to) openTickets.set(row.assigned_to, (openTickets.get(row.assigned_to) ?? 0) + 1);
    }
    const recentActions = new Map<string, number>();
    for (const row of actions.data ?? []) {
      if (row.actor_id) recentActions.set(row.actor_id, (recentActions.get(row.actor_id) ?? 0) + 1);
    }

    return NextResponse.json(
      Array.from(staff.values()).map((entry) => ({
        ...entry,
        ...permissionsFromRoles(entry.roles),
        workload: {
          open_tickets: openTickets.get(entry.profile_id) ?? 0,
          actions_7d: recentActions.get(entry.profile_id) ?? 0,
        },
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

    const parsed = PostSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password, full_name, permissions, roles } = parsed.data;

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

    const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { profile_id, permissions, roles } = parsed.data;

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
