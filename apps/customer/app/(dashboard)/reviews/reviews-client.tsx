'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, EmptyState, RatingStars } from '@urban-assist/ui';
import { ArrowLeft, ChevronDown, ChevronUp, Filter } from 'lucide-react';

export interface CustomerReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  providerName: string;
  serviceName: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function ReviewsClient({ reviews }: { reviews: CustomerReview[] }) {
  const [filterService, setFilterService] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('newest');
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  const services = React.useMemo(
    () => ['All', ...Array.from(new Set(reviews.map((review) => review.serviceName))).sort()],
    [reviews],
  );
  const processedReviews = React.useMemo(() => {
    const result = reviews.filter(
      (review) => filterService === 'All' || review.serviceName === filterService,
    );
    return [...result].sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [filterService, reviews, sortBy]);

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
    pct: reviews.length
      ? Math.round((reviews.filter((review) => review.rating === stars).length / reviews.length) * 100)
      : 0,
  }));

  return (
    <div className="space-y-6 py-2 pb-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="tap flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-base font-bold text-ink">Your Reviews</h1>
        <div className="w-10" />
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="space-y-4 rounded-xl border border-hairline bg-white p-5 shadow-card">
          <div className="space-y-1 text-center lg:text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Your average</div>
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <span className="font-display text-3xl font-extrabold text-ink">{average.toFixed(1)}</span>
              <RatingStars value={average} />
            </div>
            <p className="text-xs text-muted">Based on {reviews.length} verified booking{reviews.length === 1 ? '' : 's'}</p>
          </div>
          <div className="border-t border-hairline pt-3">
            <button
              type="button"
              onClick={() => setShowBreakdown((value) => !value)}
              className="flex w-full items-center justify-between text-xs font-bold text-accent lg:pointer-events-none"
            >
              <span>Score distribution</span>
              {showBreakdown ? <ChevronUp className="h-4 w-4 lg:hidden" /> : <ChevronDown className="h-4 w-4 lg:hidden" />}
            </button>
            <div className={`${showBreakdown ? 'block' : 'hidden'} mt-2 space-y-2 lg:block`}>
              {breakdown.map((row) => (
                <div key={row.stars} className="flex items-center gap-3 text-xs font-medium text-ink">
                  <span className="w-4 text-right text-amber">{row.stars}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-hairline">
                    <div className="h-full rounded-full bg-amber" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono-utility text-muted">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-col items-stretch justify-between gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted" />
                <select value={filterService} onChange={(event) => setFilterService(event.target.value)} className="tap rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink focus:outline-none">
                  {services.map((service) => <option key={service} value={service}>{service === 'All' ? 'All Services' : service}</option>)}
                </select>
              </div>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="tap rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink focus:outline-none">
                <option value="newest">Sort by: Newest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
            <span className="text-xs text-muted">Showing {processedReviews.length} reviews</span>
          </div>

          {processedReviews.length === 0 ? (
            <Card>
              <EmptyState
                title="No reviews yet"
                description="After a completed booking, rate your professional from the booking details page."
              />
            </Card>
          ) : (
            <ul className="space-y-4">
              {processedReviews.map((review) => (
                <li key={review.id}>
                  <Card className="space-y-2.5 border border-hairline bg-white p-5 shadow-card">
                    <div className="flex items-center gap-2">
                      <RatingStars value={review.rating} />
                      <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-ink">{review.comment || 'No comment left.'}</p>
                    <p className="text-xs text-muted">
                      <span className="font-bold text-ink">{review.providerName}</span> · {review.serviceName}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
