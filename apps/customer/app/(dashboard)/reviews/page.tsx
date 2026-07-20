import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ReviewsClient, type CustomerReview } from './reviews-client';

export const dynamic = 'force-dynamic';

interface ReviewQueryRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  target: { full_name: string | null } | null;
  booking: { category: { name: string } | null } | null;
}

export default async function ReviewsPage() {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: reviews } = await db
    .from('reviews')
    .select(
      'id, rating, comment, created_at, target_id, target:profiles!reviews_target_id_fkey(full_name), booking:bookings!inner(customer_id, category:service_categories(name))',
    )
    .eq('author_id', user.id)
    .eq('direction', 'customer_to_provider')
    .order('created_at', { ascending: false });

  const normalized: CustomerReview[] = ((reviews ?? []) as unknown as ReviewQueryRow[]).map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
    providerName: review.target?.full_name ?? 'Your professional',
    serviceName: review.booking?.category?.name ?? 'Home service',
  }));

  return <ReviewsClient reviews={normalized} />;
}
