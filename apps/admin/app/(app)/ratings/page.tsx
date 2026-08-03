import Link from 'next/link';
import { Star } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { PageHeader, TableTile, StatusChip, BentoEmpty } from '@/components/bento';
import { QualityActions } from './quality-actions';

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
  booking:
    | { id: string; category_id: string | null; short_code: string | null }
    | { id: string; category_id: string | null; short_code: string | null }[]
    | null;
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
    .select(
      'id, booking_id, author_id, target_id, direction, rating, comment, created_at, booking:bookings(id, category_id, short_code)',
    )
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
      <PageHeader
        title="Ratings & Reviews"
        subtitle={`${reviews.length} ${lowOnly ? 'low (≤2★)' : 'recent'} reviews.`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/ratings"
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                !lowOnly
                  ? 'bg-accent font-semibold text-white'
                  : 'border border-hairline bg-white text-ink hover:bg-bg'
              }`}
            >
              All reviews
            </Link>
            <Link
              href="/ratings?low=1"
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                lowOnly
                  ? 'bg-accent font-semibold text-white'
                  : 'border border-hairline bg-white text-ink hover:bg-bg'
              }`}
            >
              Low (≤2★)
            </Link>
          </div>
        }
      />

      {reviews.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={Star} message={`No reviews${lowOnly ? ' ≤2★' : ''} found.`} />
        </TableTile>
      ) : (
        <TableTile>
          {reviews.map((r) => {
            const isLow = r.rating <= 2;
            const booking = Array.isArray(r.booking) ? r.booking[0] : r.booking;
            const showActions = isLow && r.direction === 'customer_to_provider';
            return (
              <div
                key={r.id}
                className={`flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-bg/60 ${
                  isLow ? 'bg-danger/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-sm font-semibold tracking-wider ${
                        isLow ? 'text-danger' : 'text-amber'
                      }`}
                    >
                      {'★'.repeat(r.rating)}
                      <span className="text-hairline">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                    {isLow ? <StatusChip tone="danger">Low rating</StatusChip> : null}
                  </div>
                  <Link
                    href={`/bookings/${r.booking_id}`}
                    className="font-mono text-xs text-muted transition-colors hover:text-ink"
                  >
                    Booking #{booking?.short_code ?? r.booking_id.slice(0, 8)} →
                  </Link>
                </div>
                <p className="text-xs text-muted">
                  <span className="font-medium text-ink">{name.get(r.author_id) ?? '—'}</span> →{' '}
                  <span className="font-medium text-ink">{name.get(r.target_id) ?? '—'}</span>
                  {' · '}
                  <span>
                    {r.direction === 'customer_to_provider'
                      ? 'Customer rating provider'
                      : 'Provider rating customer'}
                  </span>
                  {' · '}
                  <span className="font-mono">
                    {new Date(r.created_at).toLocaleDateString('en-GB')}
                  </span>
                </p>
                {r.comment ? <p className="mt-1 text-sm text-ink">{r.comment}</p> : null}
                {showActions ? (
                  <QualityActions
                    reviewId={r.id}
                    providerId={r.target_id}
                    bookingId={r.booking_id}
                    categoryId={booking?.category_id ?? null}
                  />
                ) : null}
              </div>
            );
          })}
        </TableTile>
      )}
    </div>
  );
}
