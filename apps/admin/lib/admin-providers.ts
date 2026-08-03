import { buildOfferedCategoryTrainingRow } from '@urban-assist/domain';

import { requireAdminPermission } from './admin-auth';
import {
  providerIdsCoveringCityPostcodes,
  type AdminProviderListFilters,
} from './admin-provider-filters';

export type { AdminProviderListFilters } from './admin-provider-filters';
export { readProviderFilters } from './admin-provider-filters';

export type ProviderServiceArea = {
  id: string;
  category_id: string | null;
  postcode_pattern: string;
};

export type AdminProviderListRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_online: boolean;
  is_blocked: boolean;
  kyc_status: 'pending' | 'approved' | 'rejected';
  rating_avg: number | null;
  training_incomplete: boolean;
};

/**
 * Provider directory for ops filters (KYC / category / training / city / postcode).
 * // ponytail: in-memory training join; index/RPC if provider count >> hundreds
 */
export async function listAdminProviders(filters: AdminProviderListFilters = {
  kyc: null,
  categoryId: null,
  training: null,
  postcode: null,
  city: null,
}): Promise<{
  providers: AdminProviderListRow[];
  categories: { id: string; name: string }[];
  count: number;
}> {
  const { db } = await requireAdminPermission('can_manage_providers');
  const adminDb = db as any;

  const [{ data: categories }, categoryIds, postcodeIds, cityIds, trainingSets] =
    await Promise.all([
      adminDb.from('service_categories').select('id, name').order('name'),
      filters.categoryId
        ? loadProviderIdsOfferingCategory(adminDb, filters.categoryId)
        : Promise.resolve(null as Set<string> | null),
      filters.postcode
        ? loadProviderIdsCoveringPostcode(adminDb, filters.postcode)
        : Promise.resolve(null as Set<string> | null),
      filters.city
        ? loadProviderIdsInCity(adminDb, filters.city)
        : Promise.resolve(null as Set<string> | null),
      loadTrainingProviderSets(adminDb, filters.categoryId),
    ]);

  let geoIds: Set<string> | null = null;
  if (postcodeIds) geoIds = intersectOrReplace(geoIds, postcodeIds);
  if (cityIds) geoIds = intersectOrReplace(geoIds, cityIds);

  let allowed: Set<string> | null = null;
  if (categoryIds) allowed = categoryIds;
  if (geoIds) allowed = intersectOrReplace(allowed, geoIds);

  if (filters.training === 'incomplete') {
    allowed = intersectOrReplace(allowed, trainingSets.incomplete);
  } else if (filters.training === 'eligible') {
    if (filters.categoryId) {
      allowed = difference(categoryIds ?? new Set(), trainingSets.incomplete);
      if (geoIds) allowed = intersectOrReplace(allowed, geoIds);
    } else {
      const { data: allProviders } = await adminDb.from('profiles').select('id').eq('role', 'provider');
      const allIds = new Set(
        ((allProviders ?? []) as { id: string }[]).map((row) => row.id),
      );
      allowed = difference(allIds, trainingSets.incomplete);
      if (geoIds) allowed = intersectOrReplace(allowed, geoIds);
    }
  }

  let query = adminDb
    .from('profiles')
    .select('id, full_name, email, is_online, is_blocked, kyc_status, rating_avg, created_at')
    .eq('role', 'provider')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filters.kyc) query = query.eq('kyc_status', filters.kyc);
  if (allowed) {
    if (allowed.size === 0) {
      return { providers: [], categories: categories ?? [], count: 0 };
    }
    query = query.in('id', Array.from(allowed));
  }

  const { data } = await query;
  const providers = ((data ?? []) as Omit<AdminProviderListRow, 'training_incomplete'>[]).map(
    (p) => ({
      ...p,
      training_incomplete: trainingSets.incomplete.has(p.id),
    }),
  );

  return {
    providers,
    categories: (categories ?? []) as { id: string; name: string }[],
    count: providers.length,
  };
}

async function loadProviderIdsOfferingCategory(
  adminDb: any,
  categoryId: string,
): Promise<Set<string>> {
  const { data } = await adminDb
    .from('provider_services')
    .select('provider_id')
    .eq('category_id', categoryId)
    .eq('is_active', true);
  return new Set((data ?? []).map((row: { provider_id: string }) => row.provider_id));
}

/** Providers whose service-area postcode_pattern covers this prefix. */
async function loadProviderIdsCoveringPostcode(
  adminDb: any,
  postcodePrefix: string,
): Promise<Set<string>> {
  const prefix = postcodePrefix.toUpperCase().replace(/\s+/g, '');
  // Match patterns that are prefixes of the query OR the query is a prefix of the pattern.
  // e.g. filter SW1 finds pattern SW1 / SW1A; filter SW1A finds pattern SW1 / SW1A.
  const { data } = await adminDb
    .from('provider_service_areas')
    .select('provider_id, postcode_pattern')
    .limit(2000);

  const ids = new Set<string>();
  for (const row of (data ?? []) as { provider_id: string; postcode_pattern: string }[]) {
    const pattern = row.postcode_pattern.toUpperCase().replace(/\s+/g, '');
    if (!pattern) continue;
    if (prefix.startsWith(pattern) || pattern.startsWith(prefix)) {
      ids.add(row.provider_id);
    }
  }
  return ids;
}

/**
 * City filter: providers with an address in that city, or whose service areas
 * cover postcodes known for addresses in that city (ops “who covers London?”).
 */
async function loadProviderIdsInCity(adminDb: any, city: string): Promise<Set<string>> {
  const [{ data: ownAddrs }, { data: cityAddrs }, { data: areas }] = await Promise.all([
    adminDb.from('addresses').select('profile_id').ilike('city', `%${city}%`).limit(500),
    adminDb.from('addresses').select('postcode').ilike('city', `%${city}%`).limit(500),
    adminDb.from('provider_service_areas').select('provider_id, postcode_pattern').limit(2000),
  ]);

  const ids = new Set(
    ((ownAddrs ?? []) as { profile_id: string }[]).map((row) => row.profile_id),
  );
  const covering = providerIdsCoveringCityPostcodes(
    (areas ?? []) as { provider_id: string; postcode_pattern: string }[],
    ((cityAddrs ?? []) as { postcode: string }[]).map((row) => row.postcode),
  );
  for (const id of covering) ids.add(id);
  return ids;
}

/** Providers with ≥1 incomplete offered gated category (optionally scoped). */
async function loadTrainingProviderSets(
  adminDb: any,
  categoryId: string | null,
): Promise<{ incomplete: Set<string> }> {
  const [{ data: offers }, { data: gatingItems }, { data: completions }] = await Promise.all([
    adminDb
      .from('provider_services')
      .select('provider_id, category_id, is_active')
      .eq('is_active', true),
    adminDb
      .from('training_items')
      .select('id, category_id, pass_score')
      .eq('is_active', true)
      .eq('gates_category', true)
      .not('category_id', 'is', null),
    adminDb.from('provider_training_completions').select('provider_id, item_id, score'),
  ]);

  const gatingByCategory = new Map<string, { id: string; pass_score: number | null }[]>();
  for (const item of gatingItems ?? []) {
    if (!item.category_id) continue;
    const list = gatingByCategory.get(item.category_id) ?? [];
    list.push({ id: item.id, pass_score: item.pass_score ?? null });
    gatingByCategory.set(item.category_id, list);
  }

  const completionsByProvider = new Map<string, { item_id: string; score: number | null }[]>();
  for (const row of completions ?? []) {
    const list = completionsByProvider.get(row.provider_id) ?? [];
    list.push({ item_id: row.item_id, score: row.score ?? null });
    completionsByProvider.set(row.provider_id, list);
  }

  const incomplete = new Set<string>();
  const seen = new Set<string>();

  for (const offer of offers ?? []) {
    if (categoryId && offer.category_id !== categoryId) continue;
    const key = `${offer.provider_id}:${offer.category_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const gating = gatingByCategory.get(offer.category_id) ?? [];
    const row = buildOfferedCategoryTrainingRow({
      providerId: offer.provider_id,
      providerName: null,
      categoryId: offer.category_id,
      categoryName: '',
      categorySlug: '',
      gatingItems: gating,
      completions: completionsByProvider.get(offer.provider_id) ?? [],
    });
    if (row && !row.isEligible) incomplete.add(offer.provider_id);
  }

  return { incomplete };
}

function intersectOrReplace(current: Set<string> | null, next: Set<string>): Set<string> {
  if (!current) return new Set(next);
  const out = new Set<string>();
  for (const id of current) {
    if (next.has(id)) out.add(id);
  }
  return out;
}

function difference(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const id of a) {
    if (!b.has(id)) out.add(id);
  }
  return out;
}

export async function getAdminProviderDetail(providerId: string) {
  const { db, roles } = await requireAdminPermission('can_manage_providers');
  const adminDb = db as any;

  const [
    profileResult,
    servicesResult,
    areasResult,
    categoriesResult,
    documentsResult,
    notesResult,
    bookingsResult,
    reviewsResult,
    disputesResult,
  ] = await Promise.all([
    adminDb
      .from('profiles')
      .select('id, full_name, email, phone, kyc_status, is_online, is_blocked, last_seen_at, rating_avg, rating_count, acceptance_rate, stripe_account_id, created_at')
      .eq('id', providerId)
      .eq('role', 'provider')
      .single(),
    adminDb
      .from('provider_services')
      .select('id, category_id, title, price_pence, duration_mins, is_active, category:service_categories(id, name, slug)')
      .eq('provider_id', providerId)
      .order('created_at'),
    adminDb
      .from('provider_service_areas')
      .select('id, category_id, postcode_pattern')
      .eq('provider_id', providerId)
      .order('postcode_pattern'),
    adminDb
      .from('service_categories')
      .select('id, name, slug')
      .order('sort_order')
      .order('name'),
    adminDb
      .from('provider_documents')
      .select('id, doc_type, storage_path, expires_at, uploaded_at')
      .eq('provider_id', providerId)
      .order('uploaded_at', { ascending: false }),
    adminDb
      .from('provider_admin_notes')
      .select('id, note, created_at, admin:profiles!provider_admin_notes_admin_user_id_fkey(full_name, email)')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(50),
    adminDb
      .from('bookings')
      .select('id, customer_id, status, total_pence, created_at')
      .eq('provider_id', providerId),
    adminDb
      .from('reviews')
      .select('rating')
      .eq('target_id', providerId)
      .eq('direction', 'customer_to_provider'),
    adminDb
      .from('support_tickets')
      .select('id, bookings!inner(provider_id)')
      .eq('bookings.provider_id', providerId),
  ]);

  if (profileResult.error) throw profileResult.error;
  const bookings = bookingsResult.data ?? [];
  const completed = bookings.filter((booking: any) => booking.status === 'completed');
  const cancelled = bookings.filter((booking: any) => booking.status === 'cancelled');
  const customerCounts = new Map<string, number>();
  for (const booking of completed) {
    customerCounts.set(booking.customer_id, (customerCounts.get(booking.customer_id) ?? 0) + 1);
  }
  const repeatCustomers = Array.from(customerCounts.values()).filter((count) => count > 1).length;
  const ratings = reviewsResult.data ?? [];

  return {
    profile: profileResult.data,
    services: servicesResult.data ?? [],
    serviceAreas: areasResult.data ?? [],
    categories: categoriesResult.data ?? [],
    documents: documentsResult.data ?? [],
    notes: notesResult.data ?? [],
    canAddNotes: roles.some((role: string) => ['super_admin', 'ops_admin', 'support_agent'].includes(role)),
    metrics: {
      completedJobs: completed.length,
      cancellationRate: bookings.length ? cancelled.length / bookings.length : 0,
      averageRating: ratings.length
        ? ratings.reduce((sum: number, review: any) => sum + Number(review.rating), 0) / ratings.length
        : Number(profileResult.data.rating_avg ?? 0),
      revenueGeneratedPence: completed.reduce(
        (sum: number, booking: any) => sum + Number(booking.total_pence ?? 0),
        0,
      ),
      disputesCount: disputesResult.data?.length ?? 0,
      repeatCustomerRate: customerCounts.size ? repeatCustomers / customerCounts.size : 0,
    },
  };
}
