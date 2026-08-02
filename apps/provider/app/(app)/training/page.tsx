import { redirect } from 'next/navigation';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { summarizeTraining } from '@urban-assist/domain';
import { TrainingList } from './training-list';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');

  // Soft-refresh eligibility so new gating modules appear without waiting for a toggle.
  try {
    const admin = createServiceRole();
    await admin.rpc('refresh_provider_training_eligibility', { p_provider_id: user.id });
  } catch {
    // Local DB may not have migration yet; list still works.
  }

  const [{ data: items }, { data: done }, { data: mine }, { data: eligibility }] =
    await Promise.all([
      db
        .from('training_items')
        .select(
          'id, category_id, title, description, content_url, kind, is_mandatory, gates_category, pass_score, estimated_mins, sort_order, category:service_categories(name)',
        )
        .eq('is_active', true)
        .order('sort_order'),
      db
        .from('provider_training_completions')
        .select('item_id, completed_at, score, source')
        .eq('provider_id', user.id),
      db.from('provider_services').select('category_id').eq('provider_id', user.id),
      db
        .from('provider_category_eligibility')
        .select('category_id, required_modules, completed_modules, is_eligible')
        .eq('provider_id', user.id),
    ]);

  const myCategories = new Set((mine ?? []).map((s: { category_id: string }) => s.category_id));
  const relevant = (items ?? []).filter(
    (i: { category_id: string | null }) => !i.category_id || myCategories.has(i.category_id),
  );

  const completedAt = new Map(
    (done ?? []).map((d: { item_id: string; completed_at: string }) => [
      d.item_id,
      d.completed_at,
    ]),
  );

  const summary = summarizeTraining(
    relevant.map((i: any) => ({
      id: i.id,
      category_id: i.category_id,
      is_mandatory: i.is_mandatory,
      gates_category: i.gates_category,
    })),
    (done ?? []).map((d: any) => ({ item_id: d.item_id })),
    eligibility ?? [],
    myCategories,
  );

  return (
    <TrainingList
      summary={{
        mandatoryCompleted: summary.mandatoryCompleted,
        mandatoryTotal: summary.mandatoryTotal,
        gatedCategoriesIncomplete: summary.gatedCategoriesIncomplete,
      }}
      items={relevant.map((i: any) => ({
        ...i,
        category: Array.isArray(i.category) ? i.category[0] : i.category,
        completed_at: completedAt.get(i.id) ?? null,
      }))}
    />
  );
}
