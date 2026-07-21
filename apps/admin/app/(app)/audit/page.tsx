import { getSupabaseServer } from '@urban-assist/db/server';
import { ScrollText } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { db, user } = await requireAdminPermission('can_view_audit_log');
  const value = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const page = Math.max(1, Number(value('page') ?? 1) || 1);
  const limit = 50;
  const { data: rows, error } = await (db as any).rpc('get_admin_action_logs', {
    p_actor_user_id: user.id,
    p_action_type: value('action_type') || null,
    p_entity_type: value('entity_type') || null,
    p_actor_filter: value('actor') || null,
    p_from: value('from') ? value('from') + 'T00:00:00' : null,
    p_to: value('to') ? value('to') + 'T23:59:59.999' : null,
    p_limit: limit,
    p_offset: (page - 1) * limit,
  });
  if (error) throw new Error(error.message);

  const actorIds = Array.from(new Set((rows ?? []).map((row: any) => row.actor_user_id)));
  const { data: actors } = actorIds.length
    ? await db.from('profiles').select('id, full_name, email').in('id', actorIds)
    : { data: [] };
  const actorNames = new Map((actors ?? []).map((actor) => [
    actor.id,
    actor.full_name ?? actor.email ?? actor.id.slice(0, 8),
  ]));
  const count = rows?.length ?? 0;
  const nextParams = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (first && key !== 'page') nextParams.set(key, first);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Audit Logs</h1>
        <p className="text-sm text-muted mt-1">Immutable admin actions, newest first.</p>
      </div>

      <form className="card mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6" method="GET">
        <input className="input" name="actor" defaultValue={value('actor')} placeholder="Actor UUID" />
        <input className="input" name="action_type" defaultValue={value('action_type')} placeholder="Action type" />
        <input className="input" name="entity_type" defaultValue={value('entity_type')} placeholder="Entity type" />
        <input className="input" type="date" name="from" defaultValue={value('from')} />
        <input className="input" type="date" name="to" defaultValue={value('to')} />
        <button className="btn-primary" type="submit">Filter</button>
      </form>

      {!rows || rows.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <ScrollText className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No audit log entries yet.</p>
        </div>
      ) : (
        <div className="border border-hairline rounded-xl overflow-x-auto bg-white shadow-card">
          <table className="w-full text-left text-sm text-ink border-collapse">
            <thead>
              <tr className="bg-bg/40 border-b border-hairline font-mono-utility text-xs text-muted uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Time</th>
                <th className="px-4 py-3 font-bold">Actor</th>
                <th className="px-4 py-3 font-bold">Action</th>
                <th className="px-4 py-3 font-bold">Entity</th>
                <th className="px-4 py-3 font-bold">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-bg/10 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted">
                    {new Date(r.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {actorNames.get(r.actor_user_id) ?? r.actor_user_id.slice(0, 8)}
                    <span className="ml-2 text-[10px] text-muted">{r.actor_role_code}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono-utility text-xs">{r.action_type}</td>
                  <td className="px-4 py-2.5 text-xs">{r.entity_type}</td>
                  <td className="px-4 py-2.5 font-mono-utility text-xs text-muted">
                    {String(r.entity_id).slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        {page > 1 ? (
          <a className="btn-secondary" href={'/audit?' + nextParams.toString() + '&page=' + (page - 1)}>Previous</a>
        ) : <span />}
        {count === limit && (
          <a className="btn-secondary" href={'/audit?' + nextParams.toString() + '&page=' + (page + 1)}>Next</a>
        )}
      </div>
    </div>
  );
}
