import { cache } from 'react';
import { getSupabaseServer } from '@urban-assist/db/server';
import {
  SERVICE_CATEGORIES,
  type Category,
  type Subcategory,
  type ServiceItem,
} from './services-data';

export type { Category, Subcategory, ServiceItem };

// Deduped per request: getServiceBySlug → getSubcategoryBySlug → getCategoryBySlug
// all call this; cache() collapses them into a single fetch.
export const getCatalogTree = cache(async (): Promise<Category[]> => {
  try {
    const db = getSupabaseServer();
    const [{ data: categories }, { data: subcategories }, { data: skus }] = await Promise.all([
      db.from('service_categories').select('*').order('sort_order'),
      db.from('service_subcategories').select('*').order('sort_order'),
      db.from('service_skus').select('*').eq('is_active', true).order('sort_order'),
    ]);

    if (!categories || categories.length === 0) {
      return SERVICE_CATEGORIES;
    }

    const subsByCatId = new Map<string, any[]>();
    for (const sub of subcategories ?? []) {
      const list = subsByCatId.get(sub.category_id) ?? [];
      list.push(sub);
      subsByCatId.set(sub.category_id, list);
    }

    const skusBySubcatId = new Map<string, any[]>();
    for (const sku of skus ?? []) {
      const list = skusBySubcatId.get(sku.subcategory_id) ?? [];
      list.push(sku);
      skusBySubcatId.set(sku.subcategory_id, list);
    }

    return categories.map((c: any) => {
      const dbSubs = subsByCatId.get(c.id) ?? [];
      const mappedSubs: Subcategory[] = dbSubs.map((s: any) => {
        const dbSkus = skusBySubcatId.get(s.id) ?? [];
        const mappedSkus: ServiceItem[] = dbSkus.map((k: any) => ({
          id: k.id,
          slug: k.slug,
          name: k.name,
          description: k.description ?? '',
          minPricePence: k.min_price_pence ?? c.min_price_pence ?? 0,
          maxPricePence: k.max_price_pence ?? c.max_price_pence ?? 0,
          durationMins: k.duration_mins ?? 60,
          isPopular: Boolean(k.is_popular),
        }));

        return {
          id: s.id,
          slug: s.slug,
          name: s.name,
          description: s.description ?? '',
          icon: s.icon ?? c.icon ?? 'sparkles',
          sortOrder: s.sort_order ?? 0,
          services: mappedSkus,
        };
      });

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description ?? '',
        icon: c.icon ?? 'wrench',
        minPricePence: c.min_price_pence ?? 0,
        maxPricePence: c.max_price_pence ?? 0,
        sortOrder: c.sort_order ?? 0,
        color: c.color ?? '#1F3A4D',
        subcategories: mappedSubs,
      };
    });
  } catch (err) {
    console.error('Failed to fetch catalog tree from DB, falling back to static taxonomy:', err);
    return SERVICE_CATEGORIES;
  }
});

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const tree = await getCatalogTree();
  return tree.find((c) => c.slug === slug);
}

export async function getSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string,
): Promise<Subcategory | undefined> {
  const category = await getCategoryBySlug(categorySlug);
  return category?.subcategories.find((s) => s.slug === subcategorySlug);
}

export async function getServiceBySlug(
  categorySlug: string,
  subcategorySlug: string,
  serviceSlug: string,
): Promise<ServiceItem | undefined> {
  const subcategory = await getSubcategoryBySlug(categorySlug, subcategorySlug);
  return subcategory?.services.find((k) => k.slug === serviceSlug);
}
