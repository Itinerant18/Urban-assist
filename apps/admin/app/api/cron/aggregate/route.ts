import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRole } from '@urban-assist/db/server';
import { redis } from '@urban-assist/integrations/redis';
import { buildLiquidityData, percentageChange } from '@/lib/dashboard-metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleAggregation(req);
}

export async function POST(req: NextRequest) {
  return handleAggregation(req);
}

async function handleAggregation(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = createServiceRole();
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
      .filter((payment) => payment.created_at >= todayStart.toISOString())
      .reduce((sum, payment) => sum + payment.amount_pence, 0);
    const yesterdayGrossVolumePence = payments
      .filter((payment) => payment.created_at < todayStart.toISOString())
      .reduce((sum, payment) => sum + payment.amount_pence, 0);
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

    // Cache to Upstash Redis
    const r = redis();
    await r.set('admin:dashboard:stats', stats);

    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
