import { CalendarDays } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { PageHeader, TableTile, BentoEmpty } from '@/components/bento';

export const dynamic = 'force-dynamic';

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
      <PageHeader
        title="Scheduling"
        subtitle={`Upcoming provider time-off (${timeOff.length}).`}
        action={<CalendarDays className="h-5 w-5 text-muted" aria-hidden />}
      />

      {timeOff.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={CalendarDays} message="No upcoming time-off booked." />
        </TableTile>
      ) : (
        <TableTile>
          {timeOff.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <p className="text-sm font-medium text-ink">{name.get(t.provider_id) ?? '—'}</p>
              <p className="text-xs font-mono text-muted">
                {d(t.start_date)}
                {t.end_date !== t.start_date && ` → ${d(t.end_date)}`}
              </p>
            </div>
          ))}
        </TableTile>
      )}
    </div>
  );
}

