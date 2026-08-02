import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isCategoryTrainingEligible,
  trainingGateMessage,
  type GatingItemLike,
  type TrainingCompletionLike,
} from '@urban-assist/domain';

/**
 * Load gating modules + completions and evaluate category training eligibility.
 * Used by offer accept and provider UI.
 */
export async function loadCategoryTrainingEligibility(
  db: SupabaseClient,
  providerId: string,
  categoryId: string | null | undefined,
): Promise<{
  eligible: boolean;
  categorySlug: string | null;
  categoryName: string | null;
  message: string | null;
}> {
  if (!categoryId) {
    return { eligible: true, categorySlug: null, categoryName: null, message: null };
  }

  const [{ data: category }, { data: items }, { data: completions }] = await Promise.all([
    db.from('service_categories').select('id, name, slug').eq('id', categoryId).maybeSingle(),
    db
      .from('training_items')
      .select('id, category_id, is_mandatory, gates_category, pass_score')
      .eq('is_active', true)
      .eq('category_id', categoryId)
      .eq('gates_category', true),
    db
      .from('provider_training_completions')
      .select('item_id, score')
      .eq('provider_id', providerId),
  ]);

  if (!items?.length) {
    return {
      eligible: true,
      categorySlug: category?.slug ?? null,
      categoryName: category?.name ?? null,
      message: null,
    };
  }

  const eligible = isCategoryTrainingEligible(
    categoryId,
    items as GatingItemLike[],
    (completions ?? []) as TrainingCompletionLike[],
  );

  return {
    eligible,
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? null,
    message: eligible
      ? null
      : trainingGateMessage(category?.slug ?? null, category?.name ?? null),
  };
}
