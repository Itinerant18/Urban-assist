import { BarChart3, PoundSterling, TrendingUp, Users, Star, HeartHandshake } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { getPreferenceMetrics } from '../../../lib/admin-bookings';
import {
  buildDailyBookingTrend,
  trendTotals,
} from '../../../lib/admin-analytics-trends';
import { buildBookingBreakdown, type BreakdownRow } from '../../../lib/admin-analytics-breakdowns';
import { BentoGrid, BentoTile, StatTile, PageHeader, SectionHeader, BentoEmpty } from '@/components/bento';

export const dynamic = 'force-dynamic';

const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(pence / 100);

type Analytics = {
  total_bookings: number;
  completed: number;
  cancelled: number;
  active: number;
  disputed: number;
  gmv_pence: number;
  bookings_30d: number;
  gmv_30d_pence: number;
  refunds_pence: number;
  customers: number;
  providers: number;
  providers_approved: number;
  avg_provider_rating: number | null;
};

function BreakdownTile({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-6 !justify-start">
      <p className="mb-3 text-xs text-muted">{title}</p>
      {rows.length === 0 ? (
        <BentoEmpty message="No bookings in this window." className="py-4" />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate font-medium text-ink">{row.label}</span>
                <span className="shrink-0 font-mono text-muted">
                  {row.bookings} · {gbp(row.completedGmvPence)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hairline/60">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(2, Math.round(row.share * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </BentoTile>
  );
}

function TrendBars({
  values,
  tone = 'accent',
}: {
  values: number[];
  tone?: 'accent' | 'ink';
}) {
  const max = Math.max(...values, 1);
  const fill = tone === 'accent' ? 'bg-accent' : 'bg-ink/70';
  return (
    <div className="flex h-24 items-end gap-1" role="img" aria-label="Trend bars">
      {values.map((v, i) => (
        <div
          key={i}
          className={`min-w-0 flex-1 rounded-sm ${fill}`}
          style={{ height: `${Math.max(4, Math.round((v / max) * 100))}%` }}
          title={String(v)}
        />
      ))}
    </div>
  );
}

export default async function AnalyticsPage() {
  const { db } = await requireAdminPermission('can_view_audit_log');
  const adminDb = db as any;
  const trendDays = 14;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (trendDays - 1));
  since.setUTCHours(0, 0, 0, 0);

  const trendCap = 10000;
  const since30d = new Date();
  since30d.setUTCDate(since30d.getUTCDate() - 29);
  since30d.setUTCHours(0, 0, 0, 0);
  const [{ data }, preference, { data: trendRows, count: trendCount }, { data: breakdownRows }] =
    await Promise.all([
      adminDb.rpc('get_admin_analytics'),
      getPreferenceMetrics(adminDb).catch(() => null),
      adminDb
        .from('bookings')
        .select('created_at, status, total_pence', { count: 'exact' })
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
        .limit(trendCap),
      adminDb
        .from('bookings')
        .select('status, total_pence, address:addresses(city), category:service_categories(name)')
        .gte('created_at', since30d.toISOString())
        .limit(trendCap),
    ]);
  const a = (data ?? {}) as Partial<Analytics>;
  // A silent cap reads as "that's all the bookings" — say so when it isn't.
  const trendTruncated = (trendCount ?? 0) > trendCap;
  const daily = buildDailyBookingTrend(
    (trendRows ?? []) as Array<{ created_at: string; status: string; total_pence: number | null }>,
    trendDays,
  );
  const totals = trendTotals(daily);

  const breakdownSource = (breakdownRows ?? []) as Array<{
    status: string;
    total_pence: number | null;
    address: { city: string | null } | null;
    category: { name: string | null } | null;
  }>;
  const byCity = buildBookingBreakdown(
    breakdownSource.map((r) => ({ label: r.address?.city ?? null, status: r.status, total_pence: r.total_pence })),
  );
  const byCategory = buildBookingBreakdown(
    breakdownSource.map((r) => ({ label: r.category?.name ?? null, status: r.status, total_pence: r.total_pence })),
  );

  const completionRate = a.total_bookings
    ? Math.round(((a.completed ?? 0) / a.total_bookings) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Marketplace KPIs and recent trends."
        action={<BarChart3 className="h-5 w-5 text-muted" aria-hidden />}
      />

      <SectionHeader title={`Last ${trendDays} days`} className="mb-3" />
      <BentoGrid className="mb-6">
        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-6 !justify-start">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Bookings created / day</p>
              <p className="mt-1 font-mono text-lg font-bold text-ink">{totals.bookings}</p>
              <p className="text-[11px] text-muted">
                {totals.completed} completed · {totals.cancelled} cancelled or unmatched
                {trendTruncated ? ` · showing first ${trendCap.toLocaleString('en-GB')} of ${trendCount?.toLocaleString('en-GB')}` : ''}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted" aria-hidden />
          </div>
          {totals.bookings === 0 ? (
            <BentoEmpty message="No bookings in this window." className="py-4" />
          ) : (
            <>
              <TrendBars values={daily.map((d) => d.bookings)} />
              <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
                <span>{daily[0]?.label}</span>
                <span>{daily[daily.length - 1]?.label}</span>
              </div>
            </>
          )}
        </BentoTile>

        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-6 !justify-start">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Completed GMV / day</p>
              <p className="mt-1 font-mono text-lg font-bold text-ink">{gbp(totals.gmvPence)}</p>
              <p className="text-[11px] text-muted">By booking date — Revenue tiles below use completion date</p>
            </div>
            <PoundSterling className="h-4 w-4 text-muted" aria-hidden />
          </div>
          {totals.gmvPence === 0 ? (
            <BentoEmpty message="No completed GMV in this window." className="py-4" />
          ) : (
            <>
              <TrendBars values={daily.map((d) => d.gmvPence)} tone="ink" />
              <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
                <span>{daily[0]?.label}</span>
                <span>{daily[daily.length - 1]?.label}</span>
              </div>
            </>
          )}
        </BentoTile>
      </BentoGrid>

      <SectionHeader title="Breakdowns · last 30 days" className="mb-3" />
      <BentoGrid className="mb-6">
        <BreakdownTile title="Bookings by city — count · completed GMV" rows={byCity} />
        <BreakdownTile title="Bookings by category — count · completed GMV" rows={byCategory} />
      </BentoGrid>

      <SectionHeader title="Revenue" className="mb-3" />
      <BentoGrid className="mb-6">
        <StatTile
          accent
          label="GMV (completed)"
          value={gbp(a.gmv_pence ?? 0)}
          icon={PoundSterling}
          className="col-span-2 md:col-span-3 lg:col-span-4"
        />
        <StatTile
          label="GMV last 30d"
          value={gbp(a.gmv_30d_pence ?? 0)}
          icon={TrendingUp}
          className="col-span-1 md:col-span-3 lg:col-span-4"
        />
        <StatTile
          label="Refunds"
          value={gbp(a.refunds_pence ?? 0)}
          deltaTone="danger"
          className="col-span-1 md:col-span-3 lg:col-span-4"
        />
      </BentoGrid>

      <SectionHeader title="Volume" className="mb-3" />
      <BentoGrid className="mb-6">
        <StatTile
          label="Completion rate"
          value={`${completionRate}%`}
          sub={`${a.completed ?? 0} of ${a.total_bookings ?? 0}`}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Bookings"
          value={String(a.total_bookings ?? 0)}
          sub={`${a.bookings_30d ?? 0} in last 30d`}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Active now"
          value={String(a.active ?? 0)}
          sub={`${a.disputed ?? 0} disputed`}
          deltaTone={(a.disputed ?? 0) > 0 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Cancelled"
          value={String(a.cancelled ?? 0)}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
      </BentoGrid>

      {preference ? (
        <>
          <SectionHeader title="Preferred professional" className="mb-3" />
          <BentoGrid className="mb-6">
            <StatTile
              label="Bookings with preference"
              value={String(preference.withPreference)}
              sub={`${preference.pending} still unmatched`}
              icon={HeartHandshake}
              className="col-span-1 md:col-span-2 lg:col-span-3"
            />
            <StatTile
              label="Honor rate"
              value={preference.honorRatePct != null ? `${preference.honorRatePct}%` : '—'}
              sub={`${preference.honored} honored · ${preference.overridden} overridden`}
              className="col-span-1 md:col-span-2 lg:col-span-3"
            />
            <StatTile
              label="Completed (honored)"
              value={String(preference.completedHonored)}
              sub={`${preference.completedOverridden} completed after override`}
              className="col-span-1 md:col-span-2 lg:col-span-3"
            />
            <StatTile
              label="Cancelled (had preference)"
              value={String(preference.cancelledWithPreference)}
              className="col-span-1 md:col-span-2 lg:col-span-3"
            />
          </BentoGrid>
        </>
      ) : null}

      <SectionHeader title="Quality & people" className="mb-3" />
      <BentoGrid>
        <StatTile
          label="Customers"
          value={String(a.customers ?? 0)}
          icon={Users}
          className="col-span-1 md:col-span-2 lg:col-span-4"
        />
        <StatTile
          label="Providers"
          value={String(a.providers ?? 0)}
          sub={`${a.providers_approved ?? 0} approved`}
          icon={Users}
          className="col-span-1 md:col-span-2 lg:col-span-4"
        />
        <StatTile
          label="Avg provider rating"
          value={a.avg_provider_rating != null ? `★ ${a.avg_provider_rating}` : '—'}
          icon={Star}
          className="col-span-2 md:col-span-2 lg:col-span-4"
        />
      </BentoGrid>
    </div>
  );
}
