import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Dashboard } from './dashboard';
import { buildWeeklyEarnings, weeklyWindow } from '../../lib/weekly-earnings';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single();
  const { data: services } = await db
    .from('provider_services')
    .select('id, title')
    .eq('provider_id', user.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const { data: jobsToday } = await db
    .from('bookings')
    .select('id, short_code, scheduled_at, status, price_pence, total_pence, category:service_categories(name), address:addresses(line1,postcode)')
    .eq('provider_id', user.id)
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at');
  const { data: openOffer } = await db
    .from('booking_offers')
    .select('id, booking_id, responds_by, booking:bookings(id,short_code,scheduled_at,total_pence,category:service_categories(name),address:addresses(line1,postcode,lat,lng))')
    .eq('provider_id', user.id)
    .eq('status', 'pending')
    .order('offered_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const now = new Date();
  const { start: weekStart, end: weekEnd } = weeklyWindow(now);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [{ data: completedBookings }, { data: terminalBookings }] = await Promise.all([
    db
      .from('bookings')
      .select('completed_at, price_pence')
      .eq('provider_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', weekStart.toISOString())
      .lt('completed_at', weekEnd.toISOString()),
    db
      .from('bookings')
      .select('status, completed_at, cancelled_at')
      .eq('provider_id', user.id)
      .in('status', ['completed', 'cancelled'])
      .not('matched_at', 'is', null)
      .or(
        `completed_at.gte.${thirtyDaysAgo.toISOString()},cancelled_at.gte.${thirtyDaysAgo.toISOString()}`,
      ),
  ]);
  const completedCount = (terminalBookings ?? []).filter(
    (booking) => booking.status === 'completed' && booking.completed_at,
  ).length;
  const cancelledCount = (terminalBookings ?? []).filter(
    (booking) => booking.status === 'cancelled' && booking.cancelled_at,
  ).length;
  const completionDenominator = completedCount + cancelledCount;

  return (
    <Dashboard
      profile={profile}
      jobsToday={jobsToday ?? []}
      openOffer={openOffer}
      servicesCount={services?.length ?? 0}
      weeklyEarnings={buildWeeklyEarnings(completedBookings ?? [], now)}
      completionRate={
        completionDenominator === 0
          ? null
          : Math.round((completedCount / completionDenominator) * 100)
      }
    />
  );
}
