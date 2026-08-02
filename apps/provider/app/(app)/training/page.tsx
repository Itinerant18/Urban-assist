import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { TrainingList } from './training-list';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: items }, { data: done }, { data: mine }] = await Promise.all([
    db
      .from('training_items')
      .select('id, category_id, title, description, content_url, kind, is_mandatory, sort_order, category:service_categories(name)')
      .eq('is_active', true)
      .order('sort_order'),
    db
      .from('provider_training_completions')
      .select('item_id, completed_at')
      .eq('provider_id', user.id),
    db.from('provider_services').select('category_id').eq('provider_id', user.id),
  ]);

  // Only show category-specific training for categories this provider actually works
  // in; everything with a null category applies to everyone.
  const myCategories = new Set((mine ?? []).map((s: any) => s.category_id));
  const relevant = (items ?? []).filter(
    (i: any) => !i.category_id || myCategories.has(i.category_id),
  );

  const completedAt = new Map(
    (done ?? []).map((d: any) => [d.item_id, d.completed_at as string]),
  );

  return (
    <TrainingList
      items={relevant.map((i: any) => ({ ...i, completed_at: completedAt.get(i.id) ?? null }))}
    />
  );
}
