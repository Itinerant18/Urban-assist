import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import {
  Briefcase,
  Users,
  ShieldCheck,
  TicketCheck,
  AlertTriangle,
  ChevronRight,
  Activity,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import { redis } from '@urban-assist/integrations/redis';
import { SyncButton } from './sync-button';
import {
  BentoGrid,
  BentoTile,
  StatTile,
  StatusChip,
  statusToneFrom,
  TableTile,
  PageHeader,
  SectionHeader,
  BentoEmpty,
} from '@/components/bento';
import { buildBookingStatusBreakdown, buildLiquidityData, buildNamedCountBreakdown } from '@/lib/dashboard-metrics';
import { countTrainingIncompleteProviders, listTrainingQualityAlertsForDashboard } from '@/lib/admin-training';

function SparkBars({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={`flex items-end gap-1 h-14 ${className ?? ''}`} aria-hidden>
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 min-w-0 rounded-sm bg-accent/40"
          style={{ height: `${Math.max(8, Math.round((v / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const db = getSupabaseServer();
  const adminDb = createServiceRole() as any;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch cached stats from Redis (for sub-50ms operations dashboard loading)
  let cachedStats: any = null;
  try {
    const r = redis();
    cachedStats = await r.get('admin:dashboard:stats');
  } catch (e) {
    console.error('Redis fetch error:', e);
  }

  // Live database fetches to serve as fallbacks & for current queues
  const [
    bookingsRes,
    providersRes,
    kycRes,
    ticketsRes,
    pendingKycUsers,
    urgentRes,
    activeJobsRes,
    paymentsTodayRes,
    bookingsCreatedTodayRes,
    exceptionsRes,
    recentStatusRes,
    todayStatusRes,
    trainingIncompleteCount,
    trainingAlerts,
  ] = await Promise.all([
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending_match'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider').eq('is_online', true),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider').eq('kyc_status', 'pending'),
    db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db
      .from('profiles')
      .select('id, full_name, kyc_status, created_at')
      .eq('role', 'provider')
      .eq('kyc_status', 'pending')
      .limit(5),
    db
      .from('support_tickets')
      .select('id, category, description, created_at, raiser:profiles(full_name), booking:bookings(short_code)')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(3),
    db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['assigned', 'on_the_way', 'arrived', 'in_progress']),
    db.from('payments').select('amount_pence').eq('status', 'succeeded').gte('created_at', todayStart.toISOString()),
    db.from('bookings').select('created_at').gte('created_at', todayStart.toISOString()),
    db
      .from('bookings')
      .select('id, short_code, status, scheduled_at, customer:profiles!bookings_customer_id_fkey(full_name)')
      .in('status', ['pending_match', 'cancelled', 'disputed'])
      .order('created_at', { ascending: false })
      .limit(8),
    db
      .from('bookings')
      .select('id, short_code, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(8),
    adminDb
      .from('bookings')
      .select(
        `
        status,
        category_id,
        category:service_categories!bookings_category_id_fkey(id, name),
        address:addresses!bookings_address_id_fkey(city, postcode)
      `,
      )
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .limit(500),
    countTrainingIncompleteProviders(adminDb),
    listTrainingQualityAlertsForDashboard(adminDb),
  ]);

  const urgentTickets: any[] = urgentRes.data ?? [];
  const processedTodayPence = (paymentsTodayRes.data ?? []).reduce(
    (sum: number, p: any) => sum + (p.amount_pence ?? 0),
    0,
  );

  const trustedCache = cachedStats?.comparisonWindow === 'today_vs_yesterday';
  const grossVolumePence = trustedCache ? cachedStats.grossVolumePence : processedTodayPence;
  const activeJobs = trustedCache ? cachedStats.activeJobsCount : (activeJobsRes.count ?? 0);
  const openTickets = trustedCache ? cachedStats.openTicketsCount : (ticketsRes.count ?? 0);
  const kycPending = kycRes.count ?? 0;
  const pendingBookings = bookingsRes.count ?? 0;
  const providersOnline = providersRes.count ?? 0;

  type TodayBookingRow = {
    status: string;
    category_id: string | null;
    category: { id: string; name: string } | { id: string; name: string }[] | null;
    address:
      | { city: string | null; postcode: string | null }
      | { city: string | null; postcode: string | null }[]
      | null;
  };
  const todayBookings = (todayStatusRes.data ?? []) as TodayBookingRow[];
  const statusBreakdown = buildBookingStatusBreakdown(todayBookings);
  const categoryLabels = todayBookings.map((b) => {
    const category = Array.isArray(b.category) ? b.category[0] : b.category;
    return category?.name ?? null;
  });
  const categoryIds = todayBookings.map((b) => {
    const category = Array.isArray(b.category) ? b.category[0] : b.category;
    return category?.id ?? b.category_id;
  });
  const cityLabels = todayBookings.map((b) => {
    const address = Array.isArray(b.address) ? b.address[0] : b.address;
    return address?.city ?? null;
  });
  const categoryBreakdown = buildNamedCountBreakdown(categoryLabels, {
    limit: 6,
    emptyLabel: 'Uncategorised',
    ids: categoryIds,
  });
  const cityBreakdown = buildNamedCountBreakdown(cityLabels, {
    limit: 6,
    emptyLabel: 'Unknown city',
  });
  const dayIso = todayStart.toISOString().slice(0, 10);

  const liquidityData = trustedCache
    ? cachedStats.liquidityData
    : buildLiquidityData(bookingsCreatedTodayRes.data ?? [], providersOnline);

  const sparkValues: number[] = liquidityData.flatMap((d: any) => [d.bookings, d.providers]);
  const volumeChange: number | undefined = trustedCache
    ? cachedStats.grossVolumeChange
    : undefined;

  const exceptions = (exceptionsRes.data ?? []) as any[];
  const activity = (recentStatusRes.data ?? []) as any[];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Platform overview — operational metrics."
        action={<SyncButton />}
      />

      <BentoGrid className="mb-6">
        {/* Hero — GMV + sparkline */}
        <BentoTile
          hero
          accent
          className="col-span-2 md:col-span-6 lg:col-span-6 lg:row-span-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Gross volume today</p>
              <p className="mt-1 text-3xl lg:text-4xl font-bold font-mono tracking-tight text-accent">
                £{(grossVolumePence / 100).toFixed(2)}
              </p>
              {volumeChange !== undefined && (
                <p
                  className={`text-[11px] mt-1 ${volumeChange >= 0 ? 'text-success' : 'text-danger'}`}
                >
                  {volumeChange >= 0 ? '↑' : '↓'} {Math.abs(volumeChange)}% vs yesterday
                </p>
              )}
            </div>
            <Briefcase className="h-4 w-4 text-muted shrink-0" aria-hidden />
          </div>
          <div className="mt-6">
            <p className="text-[11px] text-muted mb-2">Volume rhythm (supply / demand)</p>
            <SparkBars values={sparkValues} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted">
            <span>
              <span className="font-mono text-ink">{providersOnline}</span> providers online
            </span>
            <span>
              <span className="font-mono text-ink">{pendingBookings}</span> awaiting match
            </span>
          </div>
        </BentoTile>

        <StatTile
          label="Active jobs"
          value={activeJobs}
          icon={Users}
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
        <StatTile
          label="Open tickets"
          value={openTickets}
          icon={TicketCheck}
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
        <StatTile
          label="KYC pending"
          value={kycPending}
          icon={ShieldCheck}
          sub="Awaiting review"
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
        <StatTile
          label="Unassigned bookings"
          value={pendingBookings}
          icon={AlertTriangle}
          sub="Pending match"
          deltaTone={pendingBookings > 0 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
        <Link
          href="/training?threshold=incomplete"
          className="col-span-2 md:col-span-3 lg:col-span-3 block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <StatTile
            label="Training incomplete"
            value={trainingIncompleteCount}
            icon={GraduationCap}
            sub="Gated categories · open compliance"
            deltaTone={trainingIncompleteCount > 0 ? 'danger' : 'muted'}
            className="h-full"
          />
        </Link>
      </BentoGrid>

      <BentoTile static className="mb-6 !justify-start">
        <SectionHeader
          title="Today by status"
          trailing={
            <Link href="/scheduling" className="text-accent hover:underline">
              Day grid
            </Link>
          }
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {statusBreakdown.map((item) => (
            <Link
              key={item.status}
              href={`/bookings?status=${encodeURIComponent(item.status)}&from=${dayIso}&to=${dayIso}`}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-hairline bg-bg/50 px-3 py-2 text-xs transition-colors hover:bg-bg"
            >
              <StatusChip tone={statusToneFrom(item.status)}>{item.label}</StatusChip>
              <span className="font-mono font-semibold text-ink">{item.count}</span>
            </Link>
          ))}
        </div>
      </BentoTile>

      <BentoGrid className="mb-6">
        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-6 !justify-start">
          <SectionHeader
            title="Today by category"
            trailing={
              <span className="font-mono text-[11px] text-muted">{todayBookings.length} jobs</span>
            }
          />
          {categoryBreakdown.length === 0 ? (
            <BentoEmpty message="No scheduled bookings today." className="py-6" />
          ) : (
            <ul className="mt-3 space-y-3">
              {categoryBreakdown.map((row) => (
                <li key={row.label}>
                  <Link
                    href={
                      row.id
                        ? `/bookings?category=${encodeURIComponent(row.id)}&from=${dayIso}&to=${dayIso}`
                        : `/bookings?from=${dayIso}&to=${dayIso}`
                    }
                    className="block rounded-lg transition-colors hover:bg-bg/60"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-ink">{row.label}</span>
                      <span className="font-mono font-semibold text-ink">{row.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-hairline" aria-hidden>
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(6, Math.round(row.share * 100))}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BentoTile>

        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-6 !justify-start">
          <SectionHeader
            title="Today by city"
            trailing={
              <Link href="/customers" className="text-accent hover:underline">
                Customers
              </Link>
            }
          />
          {cityBreakdown.length === 0 ? (
            <BentoEmpty message="No scheduled bookings today." className="py-6" />
          ) : (
            <ul className="mt-3 space-y-3">
              {cityBreakdown.map((row) => (
                <li key={row.label}>
                  <Link
                    href={`/customers?city=${encodeURIComponent(row.label === 'Unknown city' ? '' : row.label)}`}
                    className="block rounded-lg transition-colors hover:bg-bg/60"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-ink">{row.label}</span>
                      <span className="font-mono font-semibold text-ink">{row.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-hairline" aria-hidden>
                      <div
                        className="h-full rounded-full bg-ink/70"
                        style={{ width: `${Math.max(6, Math.round(row.share * 100))}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BentoTile>
      </BentoGrid>

      <BentoGrid>
        {/* Exceptions wide tile */}
        <BentoTile static className="col-span-2 md:col-span-6 lg:col-span-8 !justify-start">
          <SectionHeader
            title="Today's exceptions"
            trailing={
              <Link href="/bookings" className="text-accent hover:underline">
                View bookings
              </Link>
            }
          />
          {exceptions.length === 0 && urgentTickets.length === 0 && trainingAlerts.length === 0 ? (
            <BentoEmpty icon={Activity} message="No exceptions right now." />
          ) : (
            <ul className="divide-y divide-hairline -mx-5">
              {trainingAlerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={alert.href}
                    className="flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
                  >
                    <GraduationCap className="h-4 w-4 text-accent shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{alert.title}</p>
                      <p className="text-[11px] text-muted truncate">{alert.detail}</p>
                    </div>
                    <StatusChip tone={alert.severity === 'danger' ? 'danger' : 'pending'}>
                      {alert.count}
                    </StatusChip>
                    <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
              {urgentTickets.map((t) => (
                <li key={`t-${t.id}`}>
                  <Link
                    href="/tickets"
                    className="flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4 text-accent shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        Ticket · {t.category}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {t.raiser?.full_name ?? 'Unknown'}
                        {t.booking?.short_code ? ` · #${t.booking.short_code}` : ''}
                      </p>
                    </div>
                    <StatusChip tone="danger">Open</StatusChip>
                    <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
              {exceptions.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
                  >
                    <Briefcase className="h-4 w-4 text-muted shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {b.customer?.full_name ?? 'Booking'}
                        {b.short_code ? (
                          <span className="font-mono text-muted ml-1.5">#{b.short_code}</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted capitalize">
                        {(b.status ?? '').replaceAll('_', ' ')}
                      </p>
                    </div>
                    <StatusChip
                      tone={
                        b.status === 'disputed' || b.status === 'cancelled'
                          ? 'danger'
                          : 'pending'
                      }
                    >
                      {(b.status ?? '—').replaceAll('_', ' ')}
                    </StatusChip>
                    <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BentoTile>

        {/* Activity rail */}
        <BentoTile static className="col-span-2 md:col-span-6 lg:col-span-4 !justify-start">
          <SectionHeader title="Live activity" trailing="Recent status" />
          {activity.length === 0 ? (
            <BentoEmpty message="No recent updates." />
          ) : (
            <ul className="space-y-3">
              {activity.map((b) => (
                <li key={b.id} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">
                      <span className="font-mono text-xs text-muted">
                        #{b.short_code ?? b.id.slice(0, 8)}
                      </span>{' '}
                      <span className="capitalize">{(b.status ?? '').replaceAll('_', ' ')}</span>
                    </p>
                    <p className="text-[11px] text-muted">
                      {b.updated_at
                        ? new Date(b.updated_at).toLocaleString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: 'short',
                          })
                        : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BentoTile>
      </BentoGrid>

      {/* KYC queue as table-tile */}
      <div className="mt-6">
        <SectionHeader
          title={`Pending KYC (${kycPending})`}
          trailing={
            <Link href="/kyc" className="text-accent hover:underline">
              Open queue
            </Link>
          }
        />
        <TableTile>
          {pendingKycUsers.data?.length ? (
            pendingKycUsers.data.map((u) => (
              <Link
                key={u.id}
                href="/kyc"
                className="flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {u.full_name ?? 'Provider'}
                  </p>
                  <p className="text-[11px] text-muted font-mono">
                    {new Date(u.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <StatusChip tone="accent">Awaiting review</StatusChip>
                <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
              </Link>
            ))
          ) : (
            <BentoEmpty message="No pending KYC requests." className="py-8" />
          )}
        </TableTile>
      </div>
    </div>
  );
}
