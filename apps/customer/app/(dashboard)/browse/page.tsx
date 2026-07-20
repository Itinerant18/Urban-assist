import { getSupabaseServer } from '@urban-assist/db/server';
import { getCached, setCached } from '@urban-assist/server-lib';
import { BrowseClient } from '../../../components/services/browse-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { category?: string; q?: string };
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const db = getSupabaseServer();

  // Resolve category if filtering by slug.
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  if (searchParams.category) {
    const { data } = await db
      .from('service_categories')
      .select('id,name')
      .eq('slug', searchParams.category)
      .single();
    if (data) {
      categoryId = data.id;
      categoryName = data.name;
    }
  }

  // Check Upstash Redis cache first
  const cacheKey = `search:${searchParams.category ?? 'all'}:${searchParams.q ?? 'all'}`;
  let filtered = await getCached<any[]>(cacheKey);

  if (!filtered) {
    let query = db
      .from('provider_services')
      .select('id, title, price_pence, duration_mins, category_id, provider:profiles!inner(id, full_name, avatar_url, rating_avg, rating_count, kyc_status)')
      .eq('is_active', true)
      .limit(50);
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data: services } = await query;

    filtered = (services ?? []).filter((s) =>
      searchParams.q
        ? (s.title + ' ' + ((s as any).provider?.full_name ?? '')).toLowerCase().includes(searchParams.q.toLowerCase())
        : true,
    );

    // Cache the filtered search results for 60 seconds
    await setCached(cacheKey, filtered, 60);
  }

  return (
    <BrowseClient initialServices={filtered} categoryName={categoryName} />
  );
}
