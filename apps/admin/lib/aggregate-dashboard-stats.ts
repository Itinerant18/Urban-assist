import type { SupabaseClient } from '@supabase/supabase-js';
import { redis } from '@urban-assist/integrations/redis';
import { buildLiquidityData, percentageChange } from '@/lib/dashboard-metrics';

// Extracted from app/api/cron/aggregate/route.ts so the scheduled route and the
// admin-triggered Sync button run the same aggregation. They authenticate
// differently — the route on CRON_SECRET, the button on an admin session — but the
// work itself must not diverge.
export async function aggregateDashboardStats(db: SupabaseClient) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [
    paymentsResult,
    activeJobsResult,
    openTicketsResult,
    pendingKycResult,
    bookingsTodayResult,
    onlineProvidersResult,
  ] = await Promise.all([
    db
      .from('payments')
      .select('amount_pence,created_at')
      .eq('status', 'succeeded')
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', tomorrowStart.toISOString()),
    db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['assigned', 'on_the_way', 'arrived', 'in_progress']),
    db
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'provider')
      .eq('kyc_status', 'pending'),
    db
      .from('bookings')
      .select('created_at')
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', tomorrowStart.toISOString()),
    db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'provider')
      .eq('is_online', true),
  ]);

  const payments = paymentsResult.data ?? [];
  const grossVolumePence = payments
    .filter((payment: any) => payment.created_at >= todayStart.toISOString())
    .reduce((sum: number, payment: any) => sum + payment.amount_pence, 0);
  const yesterdayGrossVolumePence = payments
    .filter((payment: any) => payment.created_at < todayStart.toISOString())
    .reduce((sum: number, payment: any) => sum + payment.amount_pence, 0);
  const grossVolumeChange = percentageChange(grossVolumePence, yesterdayGrossVolumePence);
  const liquidityData = buildLiquidityData(
    bookingsTodayResult.data ?? [],
    onlineProvidersResult.count ?? 0,
  );

  const stats = {
    grossVolumePence,
    ...(grossVolumeChange === undefined ? {} : { grossVolumeChange }),
    activeJobsCount: activeJobsResult.count ?? 0,
    openTicketsCount: openTicketsResult.count ?? 0,
    pendingKycCount: pendingKycResult.count ?? 0,
    liquidityData,
    comparisonWindow: 'today_vs_yesterday',
    updatedAt: new Date().toISOString(),
  };

  await redis().set('admin:dashboard:stats', stats);

  return stats;
}
