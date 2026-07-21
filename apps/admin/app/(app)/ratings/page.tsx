import Link from 'next/link';
import { Star } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

type Review = {
  id: string;
  booking_id: string;
  author_id: string;
  target_id: string;
  direction: 'customer_to_provider' | 'provider_to_customer';
  rating: number;
  comment: string | null;
  created_at: string;
};

export default async function RatingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { db } = await requireAdminPermission('can_manage_users');
  const lowOnly = (Array.isArray(searchParams.low) ? searchParams.low[0] : searchParams.low) === '1';

  let query = (db as any)
    .from('reviews')
    .select('id, booking_id, author_id, target_id, direction, rating, comment, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (lowOnly) query = query.lte('rating', 2);

  const { data } = await query;
  const reviews = (data ?? []) as Review[];

  const ids = Array.from(new Set(reviews.flatMap((r) => [r.author_id, r.target_id])));
  const { data: people } = ids.length
    ? await db.from('profiles').select('id, full_name, email').in('id', ids)
    : { data: [] };
  const name = new Map(
    (people ?? []).map((p) => [p.id, p.full_name ?? p.email ?? p.id.slice(0, 8)]),
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-muted" />
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Ratings & Reviews</h1>
            <p className="text-sm text-muted mt-1">{reviews.length} {lowOnly ? '≤2★' : 'recent'}.</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/ratings" className={`rounded-lg px-3 py-1.5 ${!lowOnly ? 'bg-ink text-white' : 'border border-hairline text-muted'}`}>All</Link>
          <Link href="/ratings?low=1" className={`rounded-lg px-3 py-1.5 ${lowOnly ? 'bg-ink text-white' : 'border border-hairline text-muted'}`}>Low (≤2★)</Link>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews{lowOnly ? ' ≤2★' : ''} yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${r.rating <= 2 ? 'text-danger' : 'text-ink'}`}>
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                <Link href={`/bookings/${r.booking_id}`} className="text-xs font-mono-utility text-muted hover:text-ink">
                  {r.booking_id.slice(0, 8)}
                </Link>
              </div>
              <p className="text-xs text-muted mt-1">
                {name.get(r.author_id) ?? '—'} →{' '}
                {name.get(r.target_id) ?? '—'}
                {' · '}
                {r.direction === 'customer_to_provider' ? 'on provider' : 'on customer'}
                {' · '}
                {new Date(r.created_at).toLocaleDateString('en-GB')}
              </p>
              {r.comment && <p className="text-sm text-ink mt-2">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
