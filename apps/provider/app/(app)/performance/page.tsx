import { redirect } from 'next/navigation';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { summarizeTraining } from '@urban-assist/domain';
import { loadJobs, computePerformance } from '../../../lib/provider-data';
import { PerformanceView } from './performance-view';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');

  try {
    const admin = createServiceRole();
    await admin.rpc('refresh_provider_training_eligibility', { p_provider_id: user.id });
  } catch {
    /* migration may not be applied yet in some envs */
  }

  const [{ data: profile }, jobs, { data: reviews }, { data: items }, { data: done }, { data: mine }, { data: eligibility }] =
    await Promise.all([
      db.from('profiles').select('*').eq('id', user.id).single(),
      loadJobs(db, user.id),
      db
        .from('reviews')
        .select('id, rating, comment, created_at, author:profiles!reviews_author_id_fkey(full_name)')
        .eq('target_id', user.id)
        .eq('direction', 'customer_to_provider')
        .order('created_at', { ascending: false })
        .limit(50),
      db
        .from('training_items')
        .select('id, category_id, is_mandatory, gates_category')
        .eq('is_active', true),
      db
        .from('provider_training_completions')
        .select('item_id')
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
  const summary = summarizeTraining(
    relevant as any,
    (done ?? []) as any,
    eligibility ?? [],
    myCategories,
  );

  return (
    <PerformanceView
      stats={computePerformance(profile, jobs)}
      reviews={reviews ?? []}
      training={{
        mandatoryCompleted: summary.mandatoryCompleted,
        mandatoryTotal: summary.mandatoryTotal,
        completionLabel: `${summary.mandatoryCompleted} of ${summary.mandatoryTotal} required complete`,
        gatedIncomplete: summary.gatedCategoriesIncomplete,
      }}
    />
  );
}
