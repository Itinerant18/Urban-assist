import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Button, Input, Select } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../lib/admin-auth';
import {
  bucketBookingsByHour,
  buildHourlyCapacity,
  formatHourLabel,
  readSchedulingFilters,
  schedulingGridHours,
  weekdayFromYmd,
  type CapacityTone,
} from '../../../lib/admin-scheduling';
import {
  PageHeader,
  BentoTile,
  TableTile,
  StatusChip,
  statusToneFrom,
  BentoEmpty,
  SectionHeader,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

type DayBooking = {
  id: string;
  short_code: string | null;
  status: string;
  scheduled_at: string;
  provider_id: string | null;
  category_id: string | null;
  category: { id: string; name: string } | { id: string; name: string }[] | null;
  provider: { id: string; full_name: string | null; email: string | null } | null;
};

function capacityChipTone(tone: CapacityTone): 'success' | 'pending' | 'danger' | 'accent' {
  switch (tone) {
    case 'ok':
      return 'success';
    case 'tight':
      return 'accent';
    case 'over':
      return 'danger';
    case 'idle':
      return 'pending';
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function capacityLabel(tone: CapacityTone): string {
  switch (tone) {
    case 'ok':
      return 'OK';
    case 'tight':
      return 'Tight';
    case 'over':
      return 'Over';
    case 'idle':
      return 'Idle';
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { db } = await requireAdminPermission('can_manage_bookings');
  const filters = readSchedulingFilters(searchParams);
  const adminDb = db as any;
  const dayStart = `${filters.date}T00:00:00.000Z`;
  const dayEnd = `${filters.date}T23:59:59.999Z`;
  const weekday = weekdayFromYmd(filters.date);

  let bookingQuery = adminDb
    .from('bookings')
    .select(
      `
      id,
      short_code,
      status,
      scheduled_at,
      provider_id,
      category_id,
      category:service_categories!bookings_category_id_fkey(id, name),
      provider:profiles!bookings_provider_id_fkey(id, full_name, email)
    `,
    )
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: true })
    .limit(200);

  if (filters.categoryId) {
    bookingQuery = bookingQuery.eq('category_id', filters.categoryId);
  }

  const [{ data: bookingRows }, { data: categories }, { data: offRows }, { data: slotRows }, categoryProvidersRes] =
    await Promise.all([
      bookingQuery,
      adminDb.from('service_categories').select('id, name').order('name'),
      adminDb
        .from('time_off')
        .select('id, provider_id, start_date, end_date')
        .lte('start_date', filters.date)
        .gte('end_date', filters.date)
        .order('start_date', { ascending: true })
        .limit(100),
      adminDb
        .from('availability_slots')
        .select('provider_id, weekday, start_time, end_time')
        .eq('weekday', weekday)
        .limit(2000),
      filters.categoryId
        ? adminDb
            .from('provider_services')
            .select('provider_id')
            .eq('category_id', filters.categoryId)
            .eq('is_active', true)
            .limit(2000)
        : Promise.resolve({ data: null }),
    ]);

  const bookings = (bookingRows ?? []) as DayBooking[];
  const buckets = bucketBookingsByHour(bookings);
  const hours = schedulingGridHours();
  const extraHours = [...buckets.keys()].filter((h) => !hours.includes(h)).sort((a, b) => a - b);
  const gridHours = [...hours, ...extraHours];

  const demandByHour = new Map<number, number>();
  for (const [hour, list] of buckets) {
    demandByHour.set(hour, list.length);
  }

  const timeOff = (offRows ?? []) as {
    id: string;
    provider_id: string;
    start_date: string;
    end_date: string;
  }[];
  const timeOffProviderIds = new Set(timeOff.map((t) => t.provider_id));
  const eligibleProviderIds = filters.categoryId
    ? new Set(
        ((categoryProvidersRes.data ?? []) as { provider_id: string }[]).map((r) => r.provider_id),
      )
    : null;

  const capacity = buildHourlyCapacity({
    hours: gridHours,
    demandByHour,
    slots: (slotRows ?? []) as {
      provider_id: string;
      weekday: number;
      start_time: string;
      end_time: string;
    }[],
    weekday,
    timeOffProviderIds,
    eligibleProviderIds,
  });
  const overHours = capacity.filter((row) => row.tone === 'over').length;
  const tightHours = capacity.filter((row) => row.tone === 'tight').length;

  const offIds = Array.from(timeOffProviderIds);
  const { data: offPeople } = offIds.length
    ? await db.from('profiles').select('id, full_name, email').in('id', offIds)
    : { data: [] };
  const offName = new Map(
    (offPeople ?? []).map((p) => [p.id, p.full_name ?? p.email ?? p.id.slice(0, 8)]),
  );

  const dateLabel = new Date(`${filters.date}T12:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div>
      <PageHeader
        title="Scheduling"
        subtitle={`${bookings.length} booking${bookings.length === 1 ? '' : 's'} on ${dateLabel} · ${timeOff.length} provider(s) off · ${overHours} over / ${tightHours} tight hour(s).`}
        action={<CalendarDays className="h-5 w-5 text-muted" aria-hidden />}
      />

      <BentoTile static className="mb-6 !justify-start">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="GET">
          <label className="text-xs text-muted">
            Day
            <Input className="mt-1" type="date" name="date" defaultValue={filters.date} />
          </label>
          <label className="text-xs text-muted">
            Category
            <Select className="mt-1" name="category" defaultValue={filters.categoryId ?? ''}>
              <option value="">All categories</option>
              {((categories ?? []) as { id: string; name: string }[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="font-semibold">
              Show day
            </Button>
            <Link
              href="/scheduling"
              className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-bg"
            >
              Today
            </Link>
          </div>
        </form>
      </BentoTile>

      <SectionHeader
        title="Capacity snapshot"
        trailing={
          <span className="text-[11px] text-muted">Jobs vs weekly windows · UTC hours</span>
        }
      />
      <div className="mb-8 overflow-hidden rounded-2xl border border-hairline bg-white shadow-card">
        <div className="divide-y divide-hairline">
          {capacity.map((row) => (
            <div
              key={row.hour}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:px-5"
            >
              <p className="font-mono text-xs font-semibold text-muted">
                {formatHourLabel(row.hour)}
              </p>
              <div className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted">
                  <span>
                    {row.demand} job{row.demand === 1 ? '' : 's'} · {row.supply} available
                  </span>
                  <span className="font-mono">
                    {row.load == null ? '—' : `${Math.round(row.load * 100)}%`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-hairline" aria-hidden>
                  <div
                    className={`h-full rounded-full ${
                      row.tone === 'over'
                        ? 'bg-danger'
                        : row.tone === 'tight'
                          ? 'bg-ink/70'
                          : row.tone === 'ok'
                            ? 'bg-accent'
                            : 'bg-hairline'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(row.demand === 0 ? 0 : 6, Math.round((row.load ?? (row.demand > 0 ? 1 : 0)) * 100)))}%`,
                    }}
                  />
                </div>
              </div>
              <StatusChip tone={capacityChipTone(row.tone)}>{capacityLabel(row.tone)}</StatusChip>
            </div>
          ))}
        </div>
      </div>

      <SectionHeader title="Day grid" />
      {bookings.length === 0 ? (
        <TableTile className="mb-8">
          <BentoEmpty
            icon={CalendarDays}
            message="No bookings scheduled for this day (cancelled excluded)."
          />
        </TableTile>
      ) : (
        <div className="mb-8 overflow-hidden rounded-2xl border border-hairline bg-white shadow-card">
          <div className="divide-y divide-hairline">
            {gridHours.map((hour) => {
              const slot = buckets.get(hour) ?? [];
              if (slot.length === 0 && extraHours.includes(hour)) return null;
              return (
                <div
                  key={hour}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:px-5"
                >
                  <p className="pt-1 font-mono text-xs font-semibold text-muted">
                    {formatHourLabel(hour)}
                  </p>
                  <div className="min-w-0 space-y-2">
                    {slot.length === 0 ? (
                      <p className="py-1 text-xs text-muted">—</p>
                    ) : (
                      slot.map((b) => {
                        const category = Array.isArray(b.category) ? b.category[0] : b.category;
                        const providerLabel =
                          b.provider?.full_name ?? b.provider?.email ?? 'Unassigned';
                        return (
                          <Link
                            key={b.id}
                            href={`/bookings/${b.id}`}
                            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-hairline bg-bg/40 px-3 py-2 transition-colors hover:bg-bg"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">
                                {category?.name ?? 'Uncategorised'}
                                <span className="ml-2 font-mono text-xs font-normal text-muted">
                                  #{b.short_code ?? b.id.slice(0, 8)}
                                </span>
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted">
                                {new Date(b.scheduled_at).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'UTC',
                                })}{' '}
                                UTC · {providerLabel}
                              </p>
                            </div>
                            <StatusChip tone={statusToneFrom(b.status)}>
                              {b.status.replace(/_/g, ' ')}
                            </StatusChip>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SectionHeader title="Provider time-off (this day)" />
      {timeOff.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={CalendarDays} message="No providers on time-off for this day." />
        </TableTile>
      ) : (
        <TableTile>
          {timeOff.map((t) => (
            <div
              key={t.id}
              className="flex min-h-[44px] items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg/60"
            >
              <p className="text-sm font-medium text-ink">{offName.get(t.provider_id) ?? '—'}</p>
              <p className="font-mono text-xs text-muted">
                {new Date(t.start_date).toLocaleDateString('en-GB')}
                {t.end_date !== t.start_date &&
                  ` → ${new Date(t.end_date).toLocaleDateString('en-GB')}`}
              </p>
            </div>
          ))}
        </TableTile>
      )}
    </div>
  );
}
