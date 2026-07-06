export { getUserOrThrow, AuthError } from './guards/require-auth';
export { requireRole } from './guards/require-role';
export { hasMinimumRole } from './roles';
export type { UserRole } from './roles';
