import { completionSatisfiesModule } from './quiz';

export type TrainingCompletionSource = 'self_attested' | 'quiz' | 'admin';

export type TrainingItemLike = {
  id: string;
  category_id: string | null;
  is_mandatory: boolean;
  gates_category?: boolean | null;
};

export type TrainingCompletionLike = {
  item_id: string;
  completed_at?: string | null;
  score?: number | null;
  source?: TrainingCompletionSource | null;
};

export type CategoryEligibilityLike = {
  category_id: string;
  required_modules: number;
  completed_modules: number;
  is_eligible: boolean;
};

export type TrainingSummary = {
  total: number;
  completed: number;
  mandatoryTotal: number;
  mandatoryCompleted: number;
  completionRate: number | null;
  mandatoryCompletionRate: number | null;
  gatedCategoriesIncomplete: number;
};

/**
 * Pure summary for provider training checklist + performance tiles.
 *
 * When `offeredCategoryIds` is provided, gated-incomplete only counts categories
 * the provider actually offers (RPC may snapshot every gated category).
 */
export function summarizeTraining(
  items: TrainingItemLike[],
  completions: TrainingCompletionLike[],
  eligibility: CategoryEligibilityLike[] = [],
  offeredCategoryIds?: Iterable<string> | null,
): TrainingSummary {
  const done = new Set(completions.map((c) => c.item_id));
  const total = items.length;
  const completed = items.filter((i) => done.has(i.id)).length;
  const mandatory = items.filter((i) => i.is_mandatory);
  const mandatoryCompleted = mandatory.filter((i) => done.has(i.id)).length;
  const offered =
    offeredCategoryIds == null
      ? null
      : offeredCategoryIds instanceof Set
        ? offeredCategoryIds
        : new Set(offeredCategoryIds);
  const gatedIncomplete = eligibility.filter((e) => {
    if (e.is_eligible || e.required_modules <= 0) return false;
    if (offered && !offered.has(e.category_id)) return false;
    return true;
  }).length;

  return {
    total,
    completed,
    mandatoryTotal: mandatory.length,
    mandatoryCompleted,
    completionRate: total === 0 ? null : completed / total,
    mandatoryCompletionRate: mandatory.length === 0 ? null : mandatoryCompleted / mandatory.length,
    gatedCategoriesIncomplete: gatedIncomplete,
  };
}

/** Soft eligibility: all gates_category modules for that category must be completed. */
export { isCategoryTrainingEligible, completionSatisfiesModule } from './quiz';
export type { GatingItemLike } from './quiz';

/** One ops row: provider × offered category with gating modules. */
export type AdminTrainingComplianceRow = {
  providerId: string;
  providerName: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  requiredModules: number;
  completedModules: number;
  /** 0–1 when requiredModules > 0; otherwise null. */
  completionRate: number | null;
  isEligible: boolean;
  isHighRisk: boolean;
  updatedAt: string | null;
};

export type AdminTrainingComplianceInput = {
  providerId: string;
  providerName: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  /** Gating modules for this category (gates_category = true). */
  gatingItems: { id: string; pass_score?: number | null }[];
  completions: TrainingCompletionLike[];
  updatedAt?: string | null;
};

/**
 * Build a single compliance row for an offered category.
 * Returns null when the category has no gating modules (nothing for ops to track).
 */
export function buildOfferedCategoryTrainingRow(
  input: AdminTrainingComplianceInput,
): AdminTrainingComplianceRow | null {
  const required = input.gatingItems.length;
  if (required === 0) return null;

  const byItem = new Map(input.completions.map((c) => [c.item_id, c]));
  const completed = input.gatingItems.filter((item) =>
    completionSatisfiesModule(
      {
        id: item.id,
        category_id: input.categoryId,
        is_mandatory: true,
        gates_category: true,
        pass_score: item.pass_score,
      },
      byItem.get(item.id),
    ),
  ).length;

  return {
    providerId: input.providerId,
    providerName: input.providerName,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    categorySlug: input.categorySlug,
    requiredModules: required,
    completedModules: completed,
    completionRate: completed / required,
    isEligible: completed >= required,
    isHighRisk: true,
    updatedAt: input.updatedAt ?? null,
  };
}

export type AdminTrainingFilters = {
  categoryId?: string | null;
  /** eligible | not_eligible */
  eligibility?: 'eligible' | 'not_eligible' | null;
  /** incomplete = <100%; high_risk_missing = incomplete high-risk (same set for now) */
  threshold?: 'incomplete' | 'high_risk_missing' | null;
};

/** Filter admin compliance rows (offered-category scoped inputs only). */
export function filterAdminTrainingRows(
  rows: AdminTrainingComplianceRow[],
  filters: AdminTrainingFilters = {},
): AdminTrainingComplianceRow[] {
  return rows.filter((row) => {
    if (filters.categoryId && row.categoryId !== filters.categoryId) return false;
    if (filters.eligibility === 'eligible' && !row.isEligible) return false;
    if (filters.eligibility === 'not_eligible' && row.isEligible) return false;
    if (
      (filters.threshold === 'incomplete' || filters.threshold === 'high_risk_missing') &&
      row.isEligible
    ) {
      return false;
    }
    if (filters.threshold === 'high_risk_missing' && !row.isHighRisk) return false;
    return true;
  });
}
