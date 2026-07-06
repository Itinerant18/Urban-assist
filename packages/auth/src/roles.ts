export type UserRole = 'customer' | 'provider' | 'admin' | 'super_admin';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  customer: 0,
  provider: 1,
  admin: 2,
  super_admin: 3,
};

export function hasMinimumRole(userRole: UserRole, minimum: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimum];
}
