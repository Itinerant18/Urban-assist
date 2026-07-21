import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { BookFlow } from './book-flow';

export const dynamic = 'force-dynamic';

export default async function BookPage({ params }: { params: { serviceId: string } }) {
  const db = getSupabaseServer();
  const { data: service } = await db
    .from('provider_services')
    .select('id, title, price_pence, duration_mins, provider:profiles!inner(id, full_name, avatar_url, rating_avg, kyc_status), category:service_categories!inner(name, slug)')
    .eq('id', params.serviceId)
    .single();
  if (!service) return notFound();

  const { data: { user } } = await db.auth.getUser();
  const [{ data: addresses }, walletRes] = await Promise.all([
    user
      ? db.from('addresses').select('*').eq('profile_id', user.id).order('is_default', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    user ? db.rpc('wallet_balance', { p_profile_id: user.id }) : Promise.resolve({ data: 0 }),
  ]);

  return (
    <BookFlow
      service={service as any}
      addresses={addresses ?? []}
      walletBalance={typeof walletRes.data === 'number' ? walletRes.data : 0}
    />
  );
}
