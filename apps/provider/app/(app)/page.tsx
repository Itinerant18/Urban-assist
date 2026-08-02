import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Dashboard } from './dashboard';

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
    .select('id, short_code, scheduled_at, status, total_pence, category:service_categories(name), address:addresses(line1,postcode)')
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

  // Real numbers for the two dashboard tiles that used to be literals: the
  // "Weekly Earnings Chart" was a fixed Mon–Sun array and Completion Rate was "98%".
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const [{ data: weekJobs }, completedCount, cancelledCount] = await Promise.all([
    db
      .from('bookings')
      .select('total_pence, completed_at')
      .eq('provider_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', weekStart.toISOString()),
    db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .eq('status', 'completed'),
    db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .eq('status', 'cancelled'),
  ]);

  // Seven buckets, oldest first, keyed to local calendar days.
  const weeklyEarnings = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const pence = (weekJobs ?? [])
      .filter((j: any) => {
        const at = j.completed_at ? new Date(j.completed_at) : null;
        return at !== null && at >= day && at < next;
      })
      .reduce((sum: number, j: any) => sum + (j.total_pence ?? 0), 0);
    return {
      label: day.toLocaleDateString('en-GB', { weekday: 'short' }),
      pence,
    };
  });

  const finished = completedCount.count ?? 0;
  const cancelled = cancelledCount.count ?? 0;
  // null (not 100%) when there is no history — a new provider has no rate to show.
  const completionRate =
    finished + cancelled > 0 ? finished / (finished + cancelled) : null;

  return (
    <Dashboard
      profile={profile}
      jobsToday={jobsToday ?? []}
      openOffer={openOffer}
      servicesCount={services?.length ?? 0}
      weeklyEarnings={weeklyEarnings}
      completionRate={completionRate}
    />
  );
}
