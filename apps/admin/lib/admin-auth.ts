import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';

export async function requireAdminPermission(permission: string) {
  const sessionDb = getSupabaseServer();
  const {
    data: { user },
  } = await sessionDb.auth.getUser();
  if (!user) throw new Error('unauthorized');

  const db = createServiceRole();
  const [{ data: profile }, { data: permissions }] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    db.from('admin_permissions').select('*').eq('profile_id', user.id).single(),
  ]);
  if (profile?.role !== 'admin' || !permissions?.[permission]) throw new Error('forbidden');
  return { db, user };
}
