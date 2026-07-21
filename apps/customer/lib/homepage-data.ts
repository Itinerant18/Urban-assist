import { getSupabaseServer } from '@urban-assist/db/server';
import { getCatalogTree } from './catalog';

/* Icon resolution lives in the central taxonomy (services-data.ts) so the
   homepage and the /services pages share one source of truth. */
export { getCategoryIcon } from './services-data';

/* ── Types ──────────────────────────────────────────────── */

export interface HomepageCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  minPricePence: number;
  maxPricePence: number;
  sortOrder: number;
  color?: string;
}

export interface HomepageReview {
  id: string;
  authorName: string;
  location: string;
  rating: number;
  comment: string;
}

export interface HomepageService {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  icon: string;
  pricePence: number;
  providerName?: string;
  rating?: number;
  reviewCount?: number;
}

export interface HomepageData {
  categories: HomepageCategory[];
  reviews: HomepageReview[];
  trending: HomepageService[];
  mostBooked: HomepageService[];
  promoCode: { code: string; discountType: string; discountValue: number } | null;
}

/* ── Static fallback data (demo, DB empty) ──────────────── */

const FALLBACK_REVIEWS: HomepageReview[] = [
  { id: 'r1', authorName: 'Sarah M.', location: 'London', rating: 5, comment: 'The cleaning service was outstanding. Professional, punctual, and they left my flat spotless.' },
  { id: 'r2', authorName: 'James K.', location: 'Manchester', rating: 5, comment: 'Had my washing machine repaired within 2 hours of booking. Fair price too.' },
  { id: 'r3', authorName: 'Priya R.', location: 'Birmingham', rating: 4, comment: 'Great service for AC installation. Slight delay but they communicated well.' },
];

const FALLBACK_TRENDING: HomepageService[] = [
  { id: 't1', title: 'Full Home Deep Cleaning', categorySlug: 'cleaning', categoryName: 'Home cleaning', icon: 'sparkles', pricePence: 8000, rating: 4.9, reviewCount: 240 },
  { id: 't2', title: 'Washing Machine Repair', categorySlug: 'appliance-repair', categoryName: 'Appliance repair', icon: 'settings', pricePence: 5500, rating: 4.8, reviewCount: 120 },
  { id: 't3', title: 'AC Service & Repair', categorySlug: 'electrical', categoryName: 'Electrical', icon: 'zap', pricePence: 6500, rating: 4.7, reviewCount: 98 },
  { id: 't4', title: 'Bathroom Waterproofing', categorySlug: 'painting', categoryName: 'Painting & decor', icon: 'paintbrush', pricePence: 12000, rating: 4.6, reviewCount: 72 },
];

const FALLBACK_MOST_BOOKED: HomepageService[] = [
  { id: 'm1', title: 'Bathroom Deep Cleaning', categorySlug: 'cleaning', categoryName: 'Home cleaning', icon: 'sparkles', pricePence: 39900, rating: 4.9, reviewCount: 240 },
  { id: 'm2', title: 'AC Jet Max Service', categorySlug: 'electrical', categoryName: 'Electrical', icon: 'zap', pricePence: 49900, rating: 4.8, reviewCount: 120 },
  { id: 'm3', title: 'Full Home Cleaning', categorySlug: 'cleaning', categoryName: 'Home cleaning', icon: 'sparkles', pricePence: 59900, rating: 4.9, reviewCount: 180 },
];

/* ── Fetch functions ────────────────────────────────────── */

async function fetchCategories(): Promise<HomepageCategory[]> {
  const tree = await getCatalogTree();
  return tree.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    description: c.description,
    minPricePence: c.minPricePence,
    maxPricePence: c.maxPricePence,
    sortOrder: c.sortOrder,
    color: c.color,
  }));
}

async function fetchReviews(): Promise<HomepageReview[]> {
  try {
    const db = getSupabaseServer();
    const { data } = await db
      .from('reviews')
      .select('id, rating, comment, author_id, target_id, created_at')
      .eq('direction', 'customer_to_provider')
      .order('created_at', { ascending: false })
      .limit(6);

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map((r) => r.author_id))];
      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name, city')
        .in('id', authorIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { name: p.full_name, city: p.city ?? 'UK' }]),
      );

      return data.map((r) => {
        const author = profileMap.get(r.author_id);
        return {
          id: r.id,
          authorName: author?.name ?? 'Verified Customer',
          location: author?.city ?? 'UK',
          rating: r.rating,
          comment: r.comment ?? '',
        };
      });
    }
  } catch {
    // fallback
  }
  return FALLBACK_REVIEWS;
}

async function fetchTrending(): Promise<HomepageService[]> {
  try {
    const db = getSupabaseServer();
    const { data } = await db
      .from('provider_services')
      .select('id, title, price_pence, duration_mins, is_active, category_id, categories:category_id(slug,name,icon)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8);

    if (data && data.length > 0) {
      return data.map((s) => {
        const categoryData = Array.isArray(s.categories) ? s.categories[0] : s.categories;
        return {
          id: s.id,
          title: s.title,
          categorySlug: (categoryData as { slug?: string })?.slug ?? '',
          categoryName: (categoryData as { name?: string })?.name ?? '',
          icon: (categoryData as { icon?: string })?.icon ?? 'wrench',
          pricePence: s.price_pence,
        };
      });
    }
  } catch {
    // fallback
  }
  return FALLBACK_TRENDING;
}

async function fetchMostBooked(): Promise<HomepageService[]> {
  try {
    const db = getSupabaseServer();
    const { data } = await db
      .from('provider_services')
      .select('id, title, price_pence, category_id, categories:category_id(slug,name,icon)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (data && data.length > 0) {
      return data.map((s) => {
        const categoryData = Array.isArray(s.categories) ? s.categories[0] : s.categories;
        return {
          id: s.id,
          title: s.title,
          categorySlug: (categoryData as { slug?: string })?.slug ?? '',
          categoryName: (categoryData as { name?: string })?.name ?? '',
          icon: (categoryData as { icon?: string })?.icon ?? 'wrench',
          pricePence: s.price_pence,
        };
      });
    }
  } catch {
    // fallback
  }
  return FALLBACK_MOST_BOOKED;
}

async function fetchPromoCode(): Promise<HomepageData['promoCode']> {
  try {
    const db = getSupabaseServer();
    const { data } = await db
      .from('promo_codes')
      .select('code, discount_type, discount_value')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    if (data) {
      return {
        code: data.code,
        discountType: data.discount_type,
        discountValue: data.discount_value,
      };
    }
  } catch {
    // fallback
  }
  return null;
}

/* ── Public API ─────────────────────────────────────────── */

export async function getHomepageData(): Promise<HomepageData> {
  const [categories, reviews, trending, mostBooked, promoCode] = await Promise.all([
    fetchCategories(),
    fetchReviews(),
    fetchTrending(),
    fetchMostBooked(),
    fetchPromoCode(),
  ]);

  return { categories, reviews, trending, mostBooked, promoCode };
}
