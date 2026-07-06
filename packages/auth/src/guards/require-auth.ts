import type { SupabaseClient } from '@supabase/supabase-js';

export class AuthError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

export async function getUserOrThrow(db: SupabaseClient) {
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new AuthError('UNAUTHORIZED');
  return user;
}
