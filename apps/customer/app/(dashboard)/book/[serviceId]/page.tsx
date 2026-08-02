import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { BookFlow } from './book-flow';

export const dynamic = 'force-dynamic';

export default async function BookPage({ params }: { params: { serviceId: string } }) {
  const db = getSupabaseServer();
  const { data: service } = await db
    .from('provider_services')
    .select(
      'id, title, price_pence, duration_mins, category_id, provider:profiles!inner(id, full_name, avatar_url, rating_avg, kyc_status), category:service_categories!inner(name, slug)',
    )
    .eq('id', params.serviceId)
    .single();
  if (!service) return notFound();

  const {
    data: { user },
  } = await db.auth.getUser();
  const [{ data: addresses }, walletRes, previousRes] = await Promise.all([
    user
      ? db
          .from('addresses')
          .select('*')
          .eq('profile_id', user.id)
          .order('is_default', { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    user ? db.rpc('wallet_balance', { p_profile_id: user.id }) : Promise.resolve({ data: 0 }),
    user
      ? db
          .from('bookings')
          .select('provider_id, provider:profiles!bookings_provider_id_fkey(id, full_name)')
          .eq('customer_id', user.id)
          .eq('category_id', service.category_id)
          .eq('status', 'completed')
          .not('provider_id', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const previousRaw = previousRes.data as
    | {
        provider_id: string;
        provider: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
      }
    | null;
  const previousProviderRow = Array.isArray(previousRaw?.provider)
    ? previousRaw?.provider[0]
    : previousRaw?.provider;
  const listedProvider = Array.isArray(service.provider) ? service.provider[0] : service.provider;
  const previousProvider =
    previousProviderRow && listedProvider && previousRaw?.provider_id !== listedProvider.id
      ? { id: previousProviderRow.id, full_name: previousProviderRow.full_name ?? 'your previous professional' }
      : null;

  const bookService = {
    ...service,
    provider: listedProvider,
    category: Array.isArray(service.category) ? service.category[0] : service.category,
  };

  return (
    <BookFlow
      service={bookService as any}
      addresses={addresses ?? []}
      walletBalance={typeof walletRes.data === 'number' ? walletRes.data : 0}
      previousProvider={previousProvider}
    />
  );
}
