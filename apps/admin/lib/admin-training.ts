import {
  buildOfferedCategoryTrainingRow,
  filterAdminTrainingRows,
  type AdminTrainingComplianceRow,
} from '@urban-assist/domain';
import { requireAdminPermission } from './admin-auth';
import type { AdminTrainingListFilters } from './admin-training-filters';

export type { AdminTrainingListFilters } from './admin-training-filters';
export { readTrainingFilters } from './admin-training-filters';

/**
 * Partners × offered gated categories with completion %.
 * Scoped to categories each provider actually offers (not every gated category).
 */
export async function listAdminTrainingCompliance(
  filters: AdminTrainingListFilters = {},
): Promise<{
  rows: AdminTrainingComplianceRow[];
  categories: { id: string; name: string; slug: string }[];
  stats: { total: number; incomplete: number; eligible: number };
}> {
  const { db } = await requireAdminPermission('can_manage_providers');
  const adminDb = db as any;

  const [{ data: offers }, { data: gatingItems }, { data: completions }, { data: eligibility }, { data: categories }] =
    await Promise.all([
      adminDb
        .from('provider_services')
        .select(
          'provider_id, category_id, is_active, provider:profiles!provider_services_provider_id_fkey(id, full_name, email, role), category:service_categories(id, name, slug)',
        )
        .eq('is_active', true),
      adminDb
        .from('training_items')
        .select('id, category_id, pass_score')
        .eq('is_active', true)
        .eq('gates_category', true)
        .not('category_id', 'is', null),
      adminDb.from('provider_training_completions').select('provider_id, item_id, score'),
      adminDb
        .from('provider_category_eligibility')
        .select('provider_id, category_id, updated_at'),
      adminDb
        .from('service_categories')
        .select('id, name, slug')
        .order('sort_order')
        .order('name'),
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

  const updatedAtByKey = new Map<string, string>();
  for (const row of eligibility ?? []) {
    updatedAtByKey.set(`${row.provider_id}:${row.category_id}`, row.updated_at);
  }

  // Dedupe provider × category (a provider may list multiple services in one category).
  const seen = new Set<string>();
  const built: AdminTrainingComplianceRow[] = [];

  for (const offer of offers ?? []) {
    const provider = Array.isArray(offer.provider) ? offer.provider[0] : offer.provider;
    const category = Array.isArray(offer.category) ? offer.category[0] : offer.category;
    if (!provider || provider.role !== 'provider' || !category) continue;

    const key = `${offer.provider_id}:${offer.category_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const gatingItemsForCat = gatingByCategory.get(offer.category_id) ?? [];
    const row = buildOfferedCategoryTrainingRow({
      providerId: offer.provider_id,
      providerName: provider.full_name ?? provider.email ?? null,
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      gatingItems: gatingItemsForCat,
      completions: completionsByProvider.get(offer.provider_id) ?? [],
      updatedAt: updatedAtByKey.get(key) ?? null,
    });
    if (row) built.push(row);
  }

  built.sort((a, b) => {
    if (a.isEligible !== b.isEligible) return a.isEligible ? 1 : -1;
    const rateA = a.completionRate ?? 1;
    const rateB = b.completionRate ?? 1;
    if (rateA !== rateB) return rateA - rateB;
    return (a.providerName ?? '').localeCompare(b.providerName ?? '');
  });

  let rows = filterAdminTrainingRows(built, filters);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.providerName ?? '').toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
        r.categorySlug.toLowerCase().includes(q),
    );
  }

  // Category filter dropdown: only categories that have gating modules.
  const gatedCategoryIds = new Set(gatingByCategory.keys());
  const filterCategories = ((categories ?? []) as { id: string; name: string; slug: string }[]).filter(
    (c) => gatedCategoryIds.has(c.id),
  );

  return {
    rows,
    categories: filterCategories,
    stats: {
      total: rows.length,
      incomplete: rows.filter((r) => !r.isEligible).length,
      eligible: rows.filter((r) => r.isEligible).length,
    },
  };
}

export type ProviderTrainingModuleRow = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  isMandatory: boolean;
  gatesCategory: boolean;
  estimatedMins: number | null;
  completedAt: string | null;
  score: number | null;
};

/** Module checklist for one provider (offered categories + platform-wide modules). */
export async function getAdminProviderTrainingDetail(providerId: string): Promise<{
  profile: { id: string; full_name: string | null; email: string | null };
  modules: ProviderTrainingModuleRow[];
  compliance: AdminTrainingComplianceRow[];
}> {
  const { db } = await requireAdminPermission('can_manage_providers');
  const adminDb = db as any;

  const [{ data: profile }, { data: services }, { data: items }, { data: done }, { data: eligibility }] =
    await Promise.all([
      adminDb
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', providerId)
        .eq('role', 'provider')
        .single(),
      adminDb
        .from('provider_services')
        .select('category_id, is_active, category:service_categories(id, name, slug)')
        .eq('provider_id', providerId)
        .eq('is_active', true),
      adminDb
        .from('training_items')
        .select(
          'id, title, description, category_id, is_mandatory, gates_category, pass_score, estimated_mins, sort_order, category:service_categories(name)',
        )
        .eq('is_active', true)
        .order('sort_order'),
      adminDb
        .from('provider_training_completions')
        .select('item_id, completed_at, score')
        .eq('provider_id', providerId),
      adminDb
        .from('provider_category_eligibility')
        .select('category_id, updated_at')
        .eq('provider_id', providerId),
    ]);

  if (!profile) throw new Error('provider_not_found');

  const offered = new Map<string, { id: string; name: string; slug: string }>();
  for (const s of services ?? []) {
    const cat = Array.isArray(s.category) ? s.category[0] : s.category;
    if (cat) offered.set(cat.id, cat);
  }

  const completedAt = new Map<string, { at: string; score: number | null }>();
  for (const c of done ?? []) {
    completedAt.set(c.item_id, { at: c.completed_at, score: c.score ?? null });
  }

  const modules: ProviderTrainingModuleRow[] = (items ?? [])
    .filter((item: any) => !item.category_id || offered.has(item.category_id))
    .map((item: any) => {
      const cat = Array.isArray(item.category) ? item.category[0] : item.category;
      const completion = completedAt.get(item.id);
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        categoryId: item.category_id,
        categoryName: cat?.name ?? null,
        isMandatory: item.is_mandatory,
        gatesCategory: item.gates_category,
        estimatedMins: item.estimated_mins,
        completedAt: completion?.at ?? null,
        score: completion?.score ?? null,
      };
    });

  const gatingByCategory = new Map<string, { id: string; pass_score: number | null }[]>();
  for (const item of items ?? []) {
    if (item.gates_category && item.category_id) {
      const list = gatingByCategory.get(item.category_id) ?? [];
      list.push({ id: item.id, pass_score: item.pass_score ?? null });
      gatingByCategory.set(item.category_id, list);
    }
  }

  const updatedAtByCat = new Map<string, string>();
  for (const e of eligibility ?? []) {
    updatedAtByCat.set(e.category_id, e.updated_at);
  }

  const completionList = (done ?? []).map((d: { item_id: string; score: number | null }) => ({
    item_id: d.item_id,
    score: d.score ?? null,
  }));
  const compliance: AdminTrainingComplianceRow[] = [];
  for (const [categoryId, cat] of offered) {
    const row = buildOfferedCategoryTrainingRow({
      providerId,
      providerName: profile.full_name ?? profile.email,
      categoryId,
      categoryName: cat.name,
      categorySlug: cat.slug,
      gatingItems: gatingByCategory.get(categoryId) ?? [],
      completions: completionList,
      updatedAt: updatedAtByCat.get(categoryId) ?? null,
    });
    if (row) compliance.push(row);
  }

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
    },
    modules,
    compliance,
  };
}
