import { getSupabaseServer } from '@urban-assist/db/server';
import { ScrollText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const db = getSupabaseServer();
  const { data: rows } = await db
    .from('audit_log')
    .select('id, action, entity_type, entity_id, created_at, actor:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);

  const count = rows?.length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Audit Logs</h1>
        <p className="text-sm text-muted mt-1">{count} most recent entries.</p>
      </div>

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
                    {r.actor?.full_name ?? r.actor?.email ?? 'System'}
                  </td>
                  <td className="px-4 py-2.5 font-mono-utility text-xs">{r.action}</td>
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
    </div>
  );
}
