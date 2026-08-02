import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { SettingsView } from './settings-view';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { count: deviceCount }] = await Promise.all([
    db.from('profiles').select('stripe_account_id, travel_radius_miles').eq('id', user.id).single(),
    db
      .from('fcm_tokens')
      .select('token', { count: 'exact', head: true })
      .eq('profile_id', user.id),
  ]);

  return (
    <SettingsView
      hasStripe={!!profile?.stripe_account_id}
      travelRadius={profile?.travel_radius_miles ?? null}
      deviceCount={deviceCount ?? 0}
    />
  );
}
