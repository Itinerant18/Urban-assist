import { createServiceRole } from '@urban-assist/db/server';
import { getRequestContext } from './request-context';

export async function getAdminMembership(userId: string) {
  const db = createServiceRole();
  const { data, error } = await (db as any)
    .from('admin_user_roles')
    .select('admin_roles!inner(code)')
    .eq('user_id', userId);

  if (error || !data?.length) throw new Error('admin_access_required');
  return {
    db,
    roleCode: data[0]?.admin_roles?.code as string,
  };
}

export async function auditAdminLogin(userId: string, request: Request) {
  const { db, roleCode } = await getAdminMembership(userId);
  const context = getRequestContext(request);
  await (db as any).rpc('append_admin_action_log', {
    p_actor_user_id: userId,
    p_actor_role_code: roleCode,
    p_action_type: 'ADMIN_LOGIN',
    p_entity_type: 'admin_session',
    p_context: { assurance_level: 'aal2' },
    p_ip_address: context.ipAddress,
    p_user_agent: context.userAgent,
  });
}

