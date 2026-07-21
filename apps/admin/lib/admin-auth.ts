import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';

export async function requireAdminPermission(permission: string) {
  const rolesByPermission: Record<string, string[]> = {
    can_manage_admins: ['super_admin'],
    can_manage_bookings: ['super_admin', 'ops_admin'],
    can_manage_kyc: ['super_admin', 'ops_admin'],
    can_manage_payments: ['super_admin', 'finance_admin'],
    can_manage_promo_codes: ['super_admin', 'finance_admin'],
    can_manage_providers: ['super_admin', 'ops_admin'],
    can_manage_tickets: ['super_admin', 'support_agent'],
    can_manage_users: ['super_admin', 'support_agent'],
    can_view_audit_log: [
      'super_admin',
      'ops_admin',
      'finance_admin',
      'support_agent',
      'analyst',
    ],
  };

  return requireAdminRole(rolesByPermission[permission] ?? [permission]);
}

export async function requireAdminRole(allowedRoles?: readonly string[]) {
  const sessionDb = getSupabaseServer();
  const {
    data: { user },
  } = await sessionDb.auth.getUser();
  if (!user) throw new Error('unauthorized');

  const { data: assurance, error: assuranceError } =
    await sessionDb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== 'aal2') {
    throw new Error('mfa_required');
  }

  const db = createServiceRole();
  const { data, error } = await (db as any)
    .from('admin_user_roles')
    .select('admin_roles!inner(code)')
    .eq('user_id', user.id);

  if (error) throw new Error('forbidden');

  const roles = (data ?? [])
    .map((membership: any) => membership.admin_roles?.code)
    .filter((role: unknown): role is string => typeof role === 'string');

  if (
    roles.length === 0 ||
    (allowedRoles?.length && !allowedRoles.some((role) => roles.includes(role)))
  ) {
    throw new Error('forbidden');
  }

  return { db, user, roles };
}
