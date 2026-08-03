// Single source for the role catalogue and the role → permission policy.
// The matrix on /staff and the flags returned by /api/staff both derive from
// here; an editable policy engine is deliberately out of scope (gap #1).

export const ROLE_OPTIONS = [
  { code: 'super_admin', label: 'Super admin', description: 'Full platform and access management.' },
  { code: 'ops_admin', label: 'Operations', description: 'Bookings, assignment, vetting, and exceptions.' },
  { code: 'finance_admin', label: 'Finance', description: 'Payments, commissions, refunds, and payouts.' },
  { code: 'support_agent', label: 'Support', description: 'Disputes and customer communications.' },
  { code: 'analyst', label: 'Analyst', description: 'Read-only dashboards and audit access.' },
] as const;

export type RoleCode = (typeof ROLE_OPTIONS)[number]['code'];

export const PERMISSION_LABELS = {
  can_manage_bookings: 'Bookings',
  can_manage_providers: 'Providers',
  can_manage_kyc: 'KYC review',
  can_manage_users: 'Customers',
  can_manage_tickets: 'Tickets',
  can_manage_payments: 'Payments',
  can_manage_promo_codes: 'Promotions',
  can_view_audit_log: 'Audit log',
  can_manage_admins: 'Admin roles',
} as const;

export type PermissionKey = keyof typeof PERMISSION_LABELS;

/** permission -> roles allowed. Derived from permissionsFromRoles — one policy source. */
export const ROLES_BY_PERMISSION: Record<PermissionKey, string[]> = Object.fromEntries(
  (Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((perm) => [
    perm,
    ROLE_OPTIONS.filter((role) => permissionsFromRoles([role.code])[perm]).map((r) => r.code),
  ]),
) as Record<PermissionKey, string[]>;

export function permissionsFromRoles(roles: string[]): Record<PermissionKey, boolean> {
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
