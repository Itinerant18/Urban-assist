import { NextResponse } from 'next/server';
import { requireAdminRole } from '../../../../lib/admin-auth';
import { ROLES_BY_PERMISSION } from '../../../../lib/admin-policy';
import { getRequestContext } from '../../../../lib/request-context';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export async function GET(request: Request) {
  try {
    const { db, user, roles } = await requireAdminRole(ROLES_BY_PERMISSION.can_view_audit_log);
    const params = new URL(request.url).searchParams;
    const value = (key: string) => params.get(key)?.trim() || null;

    const filters = {
      action_type: value('action_type'),
      entity_type: value('entity_type'),
      actor: value('actor'),
      from: value('from'),
      to: value('to'),
    };
    const { data: rows, error } = await (db as any).rpc('get_admin_action_logs', {
      p_actor_user_id: user.id,
      p_action_type: filters.action_type,
      p_entity_type: filters.entity_type,
      p_actor_filter: filters.actor,
      p_from: filters.from ? filters.from + 'T00:00:00' : null,
      p_to: filters.to ? filters.to + 'T23:59:59.999' : null,
      p_limit: 10_000,
      p_offset: 0,
    });
    if (error) throw new Error(error.message);

    const csvRows = [
      ['created_at', 'actor_user_id', 'actor_role', 'action_type', 'entity_type', 'entity_id', 'context'],
      ...(rows ?? []).map((r: any) => [
        r.created_at,
        r.actor_user_id,
        r.actor_role_code,
        r.action_type,
        r.entity_type,
        r.entity_id,
        JSON.stringify(r.context ?? {}),
      ]),
    ];
    const csv = csvRows.map((row) => row.map(csvCell).join(',')).join('\r\n');

    const requestContext = getRequestContext(request);
    await (db as any).rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: roles[0] ?? null,
      p_action_type: 'EXPORT_AUDIT_CSV',
      p_entity_type: 'audit_log',
      p_context: { filters, row_count: rows?.length ?? 0 },
      p_ip_address: requestContext.ipAddress,
      p_user_agent: requestContext.userAgent,
    });

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="audit-log.csv"',
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    const status = error?.message === 'unauthorized' ? 401 : 403;
    return NextResponse.json({ error: error?.message ?? 'export_failed' }, { status });
  }
}
