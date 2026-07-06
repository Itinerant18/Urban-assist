import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserOrThrow, AuthError } from './require-auth';

export async function requireRole(db: SupabaseClient, role: 'customer' | 'provider' | 'admin') {
  const user = await getUserOrThrow(db);
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== role) {
    throw new AuthError('FORBIDDEN', `Requires role: ${role}`);
  }
  return user;
}
