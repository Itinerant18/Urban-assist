import type { AdminTrainingFilters } from '@urban-assist/domain';

export type AdminTrainingListFilters = AdminTrainingFilters & {
  q?: string | null;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function readTrainingFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminTrainingListFilters {
  const categoryId = firstParam(searchParams.category) || null;
  const eligibilityRaw = firstParam(searchParams.eligibility);
  const eligibility =
    eligibilityRaw === 'eligible' || eligibilityRaw === 'not_eligible' ? eligibilityRaw : null;
  const thresholdRaw = firstParam(searchParams.threshold);
  const threshold =
    thresholdRaw === 'incomplete' || thresholdRaw === 'high_risk_missing' ? thresholdRaw : null;
  const q = firstParam(searchParams.q)?.trim() || null;
  return { categoryId, eligibility, threshold, q };
}
