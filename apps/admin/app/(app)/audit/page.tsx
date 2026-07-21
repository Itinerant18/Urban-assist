import { getSupabaseServer } from '@urban-assist/db/server';
import { ScrollText } from 'lucide-react';
import Link from 'next/link';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { PageHeader, BentoTile, TableTile, BentoEmpty } from '@/components/bento';

export const dynamic = 'force-dynamic';

const fieldClass =
  'w-full rounded-xl border border-hairline bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none';

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
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable admin actions, newest first."
        action={<ScrollText className="h-5 w-5 text-muted" aria-hidden />}
      />

      <BentoTile static className="mb-6 !justify-start">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6 items-end" method="GET">
          <input className={fieldClass} name="actor" defaultValue={value('actor')} placeholder="Actor UUID" />
          <input className={fieldClass} name="action_type" defaultValue={value('action_type')} placeholder="Action type" />
          <input className={fieldClass} name="entity_type" defaultValue={value('entity_type')} placeholder="Entity type" />
          <input className={fieldClass} type="date" name="from" defaultValue={value('from')} />
          <input className={fieldClass} type="date" name="to" defaultValue={value('to')} />
          <button
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            type="submit"
          >
            Filter
          </button>
        </form>
      </BentoTile>

      {!rows || rows.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={ScrollText} message="No audit log entries found." />
        </TableTile>
      ) : (
        <TableTile>
          <table className="w-full text-left text-sm text-ink border-collapse">
            <thead>
              <tr className="bg-bg/40 border-b border-hairline text-xs text-muted uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">Actor</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Entity</th>
                <th className="px-5 py-3 font-semibold">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-bg/60 transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-muted font-mono">
                    {new Date(r.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <span className="font-medium text-ink">
                      {actorNames.get(r.actor_user_id) ?? r.actor_user_id.slice(0, 8)}
                    </span>
                    <span className="ml-2 text-[10px] text-muted font-mono">{r.actor_role_code}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-ink">{r.action_type}</td>
                  <td className="px-5 py-3 text-xs text-muted">{r.entity_type}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">
                    {String(r.entity_id).slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableTile>
      )}

      <div className="mt-4 flex items-center justify-between">
        {page > 1 ? (
          <Link
            className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
            href={'/audit?' + nextParams.toString() + '&page=' + (page - 1)}
          >
            Previous
          </Link>
        ) : <span />}
        {count === limit && (
          <Link
            className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
            href={'/audit?' + nextParams.toString() + '&page=' + (page + 1)}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

