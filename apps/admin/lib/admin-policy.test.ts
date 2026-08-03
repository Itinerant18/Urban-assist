import { describe, expect, it } from 'vitest';
import { ROLES_BY_PERMISSION, ROLE_OPTIONS, permissionsFromRoles } from './admin-policy';

describe('admin policy', () => {
  // The exact access matrix requireAdminPermission enforced before unification.
  // A change here is a deliberate policy change, not a refactor side effect.
  it('ROLES_BY_PERMISSION matches the enforced matrix', () => {
    expect(ROLES_BY_PERMISSION).toEqual({
      can_manage_admins: ['super_admin'],
      can_manage_bookings: ['super_admin', 'ops_admin'],
      can_manage_kyc: ['super_admin', 'ops_admin'],
      can_manage_payments: ['super_admin', 'finance_admin'],
      can_manage_promo_codes: ['super_admin', 'finance_admin'],
      can_manage_providers: ['super_admin', 'ops_admin'],
      can_manage_tickets: ['super_admin', 'support_agent'],
      can_manage_users: ['super_admin', 'support_agent'],
      can_view_audit_log: ROLE_OPTIONS.map((r) => r.code),
    });
  });

  it('super_admin gets every permission, analyst only audit read', () => {
    const superPerms = permissionsFromRoles(['super_admin']);
    expect(Object.values(superPerms).every(Boolean)).toBe(true);

    const analyst = permissionsFromRoles(['analyst']);
    expect(analyst.can_view_audit_log).toBe(true);
    expect(
      Object.entries(analyst).filter(([k]) => k !== 'can_view_audit_log').map(([, v]) => v),
    ).toEqual(Array(8).fill(false));
  });
});
