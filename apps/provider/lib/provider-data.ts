import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side loaders shared by the onboarding pages and their post-onboarding twins.
 *
 * /onboarding/services and (app)/services ran byte-identical four-query blocks, as did
 * /onboarding and (app)/documents. The pages differ only in chrome (headings, step
 * label, max-width), so the data loading lives here and the pages keep the layout.
 */

export async function loadServiceCatalog(db: SupabaseClient, providerId: string) {
  const [categoriesRes, subcategoriesRes, skusRes, mineRes] = await Promise.all([
    db.from('service_categories').select('*').order('sort_order'),
    db
      .from('service_subcategories')
      .select('id, category_id, slug, name')
      .order('sort_order'),
    db
      .from('service_skus')
      .select(
        'id, subcategory_id, slug, name, min_price_pence, max_price_pence, duration_mins',
      )
      .eq('is_active', true)
      .order('sort_order'),
    db
      .from('provider_services')
      .select('*, service_skus(id, name)')
      .eq('provider_id', providerId),
  ]);

  // A failed query used to be indistinguishable from an empty catalogue —
  // always leave a trace so "my services page is empty" is diagnosable.
  for (const [label, res] of [
    ['service_categories', categoriesRes],
    ['service_subcategories', subcategoriesRes],
    ['service_skus', skusRes],
    ['provider_services', mineRes],
  ] as const) {
    if (res.error) console.error(`[catalog] ${label} query failed`, res.error);
  }

  return {
    categories: categoriesRes.data ?? [],
    subcategories: subcategoriesRes.data ?? [],
    skus: skusRes.data ?? [],
    mine: mineRes.data ?? [],
  };
}

export async function loadProviderDocuments(db: SupabaseClient, providerId: string) {
  const [{ data: profile }, { data: docs }] = await Promise.all([
    db.from('profiles').select('*').eq('id', providerId).single(),
    db.from('provider_documents').select('*').eq('provider_id', providerId),
  ]);

  return { profile, docs: docs ?? [] };
}

/** Columns a provider needs to judge an offer. Shared by the list and detail pages. */
const OFFER_SELECT = `
  id, booking_id, status, rank, offered_at, responds_by, responded_at, decline_reason,
  booking:bookings(
    id, short_code, scheduled_at, total_pence, price_pence, vat_pence, notes,
    payment_method, category_id,
    category:service_categories(id, name),
    address:addresses(line1, line2, city, postcode, lat, lng),
    customer:profiles!bookings_customer_id_fkey(id, full_name, rating_avg, rating_count)
  )
`;

export async function loadOffers(db: SupabaseClient, providerId: string) {
  const { data } = await db
    .from('booking_offers')
    .select(OFFER_SELECT)
    .eq('provider_id', providerId)
    .order('offered_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function loadOffer(db: SupabaseClient, providerId: string, offerId: string) {
  const { data } = await db
    .from('booking_offers')
    .select(OFFER_SELECT)
    .eq('id', offerId)
    .eq('provider_id', providerId)
    .maybeSingle();
  return data;
}

export async function loadProviderLocation(db: SupabaseClient, providerId: string) {
  const { data } = await db
    .from('provider_location')
    .select('lat, lng')
    .eq('provider_id', providerId)
    .maybeSingle();
  return data;
}

/**
 * Commission basis points per category, mirroring the SQL `commission_bps()`:
 * category rule, else the default (null category) rule, else 0.
 *
 * The function itself is `grant execute ... to service_role` only and
 * commission_rules has RLS enabled with no policies, so a provider cannot read
 * either directly — hence the service-role client. Rates are platform-wide
 * configuration, identical for every provider, so nothing user-scoped leaks.
 */
export async function loadCommissionRates(admin: SupabaseClient) {
  const { data } = await admin.from('commission_rules').select('category_id, rate_bps');
  const rules = data ?? [];
  const byCategory = new Map<string, number>();
  let fallback = 0;
  for (const r of rules) {
    if (r.category_id) byCategory.set(r.category_id, r.rate_bps);
    else fallback = r.rate_bps;
  }
  return (categoryId?: string | null) =>
    (categoryId ? byCategory.get(categoryId) : undefined) ?? fallback;
}

/** Platform cut and provider take-home for a job, from its gross price in pence. */
export function splitCommission(pricePence: number, bps: number) {
  const commission = Math.round((pricePence * bps) / 10000);
  return { commission, net: pricePence - commission, bps };
}

/** Booking statuses grouped the way a provider thinks about their day. */
export const JOB_FILTERS = {
  active: ['assigned', 'on_the_way', 'arrived', 'in_progress'],
  completed: ['completed'],
  cancelled: ['cancelled', 'disputed'],
} as const;

export type JobFilter = keyof typeof JOB_FILTERS | 'all';

export async function loadJobs(db: SupabaseClient, providerId: string) {
  const { data } = await db
    .from('bookings')
    .select(
      `id, short_code, scheduled_at, status, price_pence, total_pence, payment_method,
       arrived_at, started_at, completed_at, cancelled_at, cancellation_reason, customer_id,
       category:service_categories(name),
       address:addresses(line1, postcode)`,
    )
    .eq('provider_id', providerId)
    .order('scheduled_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

/**
 * Booking ids this provider was *offered*. A job assigned to them with no offer row
 * came from an admin dispatch instead of the auto-cascade.
 *
 * booking_status_logs.strategy would say this directly, but that table is
 * admin-read-only, so the absence of an offer is the readable signal.
 */
export async function loadOfferedBookingIds(db: SupabaseClient, providerId: string) {
  const { data } = await db
    .from('booking_offers')
    .select('booking_id')
    .eq('provider_id', providerId);
  return new Set((data ?? []).map((o: any) => o.booking_id));
}

export interface PerformanceStats {
  ratingAvg: number;
  ratingCount: number;
  acceptanceRate: number | null;
  completionRate: number | null;
  cancellationRate: number | null;
  onTimeRate: number | null;
  onTimeSample: number;
  repeatCustomers: number;
  totalCompleted: number;
}

/**
 * Every rate returns null rather than a flattering default when its denominator is
 * zero — a provider with no history has no rate, and "100%" would be a claim the
 * data does not support.
 */
export function computePerformance(
  profile: any,
  jobs: any[],
): PerformanceStats {
  const completed = jobs.filter((j) => j.status === 'completed');
  const cancelled = jobs.filter((j) => j.status === 'cancelled');
  const finished = completed.length + cancelled.length;

  // Only jobs recorded since arrived_at existed can be judged; the rest are unknown,
  // not late. Excluding them keeps the metric honest instead of punishing history.
  const timed = completed.filter((j) => j.arrived_at && j.scheduled_at);
  const onTime = timed.filter(
    (j) => new Date(j.arrived_at).getTime() <= new Date(j.scheduled_at).getTime(),
  );

  const customerCounts = new Map<string, number>();
  for (const j of completed) {
    if (!j.customer_id) continue;
    customerCounts.set(j.customer_id, (customerCounts.get(j.customer_id) ?? 0) + 1);
  }

  return {
    ratingAvg: Number(profile?.rating_avg ?? 0),
    ratingCount: profile?.rating_count ?? 0,
    acceptanceRate:
      profile?.acceptance_rate === null || profile?.acceptance_rate === undefined
        ? null
        : Number(profile.acceptance_rate),
    completionRate: finished > 0 ? completed.length / finished : null,
    cancellationRate: finished > 0 ? cancelled.length / finished : null,
    onTimeRate: timed.length > 0 ? onTime.length / timed.length : null,
    onTimeSample: timed.length,
    repeatCustomers: [...customerCounts.values()].filter((n) => n > 1).length,
    totalCompleted: completed.length,
  };
}

/**
 * The onboarding journey, numbered in one place.
 *
 * /onboarding said "Step 3 of 3" while /onboarding/services said "Step 2 of 2" — two
 * files each counting a different journey. Both now read from here, so they cannot
 * disagree again.
 */
export const ONBOARDING_STEPS = {
  total: 3,
  register: 1, // /register — account, business and bank details
  identity: 2, // /onboarding — ID + selfie
  services: 3, // /onboarding/services — services and pricing
} as const;

export const stepLabel = (step: number, name: string) =>
  `Step ${step} of ${ONBOARDING_STEPS.total}: ${name}`;
