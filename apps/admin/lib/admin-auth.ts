import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { ROLES_BY_PERMISSION, type PermissionKey } from './admin-policy';

export async function requireAdminPermission(permission: string) {
  // Single policy source: lib/admin-policy.ts. A second hardcoded map here
  // drifted from it silently — permission checks and the /staff matrix must agree.
  return requireAdminRole(ROLES_BY_PERMISSION[permission as PermissionKey] ?? [permission]);
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
