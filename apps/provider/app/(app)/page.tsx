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

  return (
    <Dashboard
      profile={profile}
      jobsToday={jobsToday ?? []}
      openOffer={openOffer}
      servicesCount={services?.length ?? 0}
    />
  );
}
