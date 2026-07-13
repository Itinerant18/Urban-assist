'use client';
import * as React from 'react';
import Link from 'next/link';
import { Card, RatingStars } from '@urban-assist/ui';
import { ArrowLeft, ChevronDown, ChevronUp, Star, Filter } from 'lucide-react';

// ponytail: curated static reviews; wire to reviews table when volume exists
const MOCK_REVIEWS = [
  {
    id: '1',
    author: 'Sarah M.',
    rating: 5,
    date: '2 days ago',
    service: 'Plumbing',
    comment: 'Absolutely fantastic service. The plumber arrived on time and fixed the leak in under an hour. Highly recommend!',
  },
  {
    id: '2',
    author: 'David T.',
    rating: 5,
    date: '1 week ago',
    service: 'Cleaning',
    comment: 'The deep clean was thorough. My flat looks brand new. Will be booking a weekly slot.',
  },
  {
    id: '3',
    author: 'Alex K.',
    rating: 4,
    date: '2 weeks ago',
    service: 'Electrical',
    comment: 'Very professional electrician. Fixed the lighting sockets quickly. Minor delay in arrival but great work.',
  },
  {
    id: '4',
    author: 'Rebecca L.',
    rating: 5,
    date: '3 weeks ago',
    service: 'Gardening',
    comment: 'Mowed the lawn and trimmed all hedges perfectly. Cleaned up all leaves afterward. Excellent value.',
  },
];

const BREAKDOWN = [
  { stars: 5, pct: 90 },
  { stars: 4, pct: 8 },
  { stars: 3, pct: 1 },
  { stars: 2, pct: 0.5 },
  { stars: 1, pct: 0.5 },
];

export default function ReviewsPage() {
  const [filterService, setFilterService] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('newest');
  const [showMobileBreakdown, setShowMobileBreakdown] = React.useState(false);

  // Unique services lists
  const servicesList = ['All', 'Cleaning', 'Plumbing', 'Electrical', 'Gardening'];

  const processedReviews = React.useMemo(() => {
    let result = [...MOCK_REVIEWS];
    
    // Filter
    if (filterService !== 'All') {
      result = result.filter((r) => r.service === filterService);
    }

    // Sort
    if (sortBy === 'highest') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => a.rating - b.rating);
    }

    return result;
  }, [filterService, sortBy]);

  const renderBreakdown = () => (
    <div className="space-y-2 pt-2">
      {BREAKDOWN.map((row) => (
        <div key={row.stars} className="flex items-center gap-3 text-xs text-ink font-medium">
          <span className="w-4 text-right text-amber">{row.stars}★</span>
          <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
            <div className="h-full bg-amber rounded-full" style={{ width: `${row.pct}%` }} />
          </div>
          <span className="w-8 text-right font-mono-utility text-muted">{row.pct}%</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 py-2 pb-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link href="/" className="tap flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-base font-bold text-ink">Customer Reviews</h1>
        <div className="w-10" />
      </header>

      {/* Aggregate review dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 items-start">
        {/* Left Side: Score summary */}
        <aside className="border border-hairline bg-white p-5 rounded-xl shadow-card space-y-4">
          <div className="text-center lg:text-left space-y-1">
            <div className="text-xs font-bold text-muted uppercase tracking-wider">Overall Rating</div>
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <span className="font-display text-3xl font-extrabold text-ink">4.8</span>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-5 w-5 fill-amber text-amber" />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted">Based on 12,450 reviews</p>
          </div>

          {/* Desktop Breakdown */}
          <div className="hidden lg:block border-t border-hairline pt-3">
            {renderBreakdown()}
          </div>

          {/* Mobile Breakdown Toggle */}
          <div className="lg:hidden border-t border-hairline pt-2">
            <button
              onClick={() => setShowMobileBreakdown(!showMobileBreakdown)}
              className="tap w-full flex items-center justify-between text-xs font-bold text-accent py-1.5"
            >
              <span>{showMobileBreakdown ? 'Hide score distribution' : 'View score distribution'}</span>
              {showMobileBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showMobileBreakdown && (
              <div className="mt-2 p-3 bg-bg/10 border border-hairline rounded-xl">
                {renderBreakdown()}
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Feed with filters */}
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-hairline pb-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted" />
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="tap border border-hairline bg-white rounded-xl px-3 py-1.5 text-xs font-semibold text-ink focus:outline-none"
                >
                  {servicesList.map((s) => (
                    <option key={s} value={s}>
                      {s === 'All' ? 'All Services' : s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sorter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="tap border border-hairline bg-white rounded-xl px-3 py-1.5 text-xs font-semibold text-ink focus:outline-none"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
            <span className="text-xs text-muted font-mono-utility">
              Showing {processedReviews.length} testimonials
            </span>
          </div>

          {/* Testimonials List */}
          <ul className="space-y-4">
            {processedReviews.map((rev) => (
              <li key={rev.id}>
                <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card space-y-2.5">
                  <div className="flex items-center gap-2">
                    <RatingStars value={rev.rating} />
                    <span className="text-xs text-muted font-mono-utility">• {rev.date}</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed italic">"{rev.comment}"</p>
                  <p className="text-xs text-muted">
                    <span className="font-bold text-ink">— {rev.author}</span>{' '}
                    <span className="text-success">✓</span> (Verified Booking: {rev.service})
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
