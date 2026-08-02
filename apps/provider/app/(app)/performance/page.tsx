import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { loadJobs, computePerformance } from '../../../lib/provider-data';
import { PerformanceView } from './performance-view';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, jobs, { data: reviews }] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).single(),
    loadJobs(db, user.id),
    db
      .from('reviews')
      .select('id, rating, comment, created_at, author:profiles!reviews_author_id_fkey(full_name)')
      .eq('target_id', user.id)
      .eq('direction', 'customer_to_provider')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <PerformanceView
      stats={computePerformance(profile, jobs)}
      reviews={reviews ?? []}
    />
  );
}
