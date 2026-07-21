import { CalendarDays } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// ponytail: read-only oversight. Providers manage their own availability_slots
// and time_off in the provider app; admin needs visibility, not another editor.
// Add write actions here only if ops starts overriding provider schedules.
export default async function SchedulingPage() {
  const { db } = await requireAdminPermission('can_manage_bookings');
  const today = new Date().toISOString().slice(0, 10);

  const { data: offRows } = await (db as any)
    .from('time_off')
    .select('id, provider_id, start_date, end_date')
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(100);
  const timeOff = (offRows ?? []) as {
    id: string;
    provider_id: string;
    start_date: string;
    end_date: string;
  }[];

  const ids = Array.from(new Set(timeOff.map((t) => t.provider_id)));
  const { data: people } = ids.length
    ? await db.from('profiles').select('id, full_name, email').in('id', ids)
    : { data: [] };
  const name = new Map(
    (people ?? []).map((p) => [p.id, p.full_name ?? p.email ?? p.id.slice(0, 8)]),
  );

  const d = (s: string) => new Date(s).toLocaleDateString('en-GB');

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted" />
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Scheduling</h1>
          <p className="text-sm text-muted mt-1">Upcoming provider time-off ({timeOff.length}).</p>
        </div>
      </div>

      {timeOff.length === 0 ? (
        <p className="text-sm text-muted">No upcoming time-off booked.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {timeOff.map((t) => (
            <div key={t.id} className="card flex items-center justify-between">
              <p className="text-sm font-medium text-ink">{name.get(t.provider_id) ?? '—'}</p>
              <p className="text-xs text-muted">
                {d(t.start_date)}
                {t.end_date !== t.start_date && ` → ${d(t.end_date)}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
