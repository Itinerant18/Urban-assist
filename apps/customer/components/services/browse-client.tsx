'use client';
import * as React from 'react';
import Link from 'next/link';
import { Star, SlidersHorizontal, X } from 'lucide-react';
import { pence } from '@urban-assist/lib';
import { Card, Badge, Button, EmptyState } from '@urban-assist/ui';

interface ServiceItem {
  id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  category_id: string;
  provider: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
    kyc_status: string;
  };
}

interface BrowseClientProps {
  initialServices: ServiceItem[];
  categoryName: string | null;
}

export function BrowseClient({ initialServices, categoryName }: BrowseClientProps) {
  // Enhance services with stable mock distances (between 1.0 and 5.5 miles)
  const services = React.useMemo(() => {
    return initialServices.map((s) => {
      const codeSum = s.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const mockDistance = ((codeSum % 45) / 10 + 1).toFixed(1);
      return {
        ...s,
        distance: parseFloat(mockDistance),
      };
    });
  }, [initialServices]);

  // Unique categories in results for filter list
  const categoriesList = [
    { name: 'Cleaning Services', slug: 'cleaning-services' },
    { name: 'Plumbing', slug: 'plumbing' },
    { name: 'Electrical', slug: 'electrical' },
    { name: 'Gardening & Outdoor', slug: 'gardening-outdoor' },
  ];

  // Filtering states
  const [selectedCats, setSelectedCats] = React.useState<string[]>([]);
  const [maxPrice, setMaxPrice] = React.useState<number>(50);
  const [minRating, setMinRating] = React.useState<number>(4);
  const [maxDistance, setMaxDistance] = React.useState<number>(5);
  
  // Mobile filter sheet visibility
  const [showFiltersMobile, setShowFiltersMobile] = React.useState(false);

  // Filter handlers
  const filteredServices = React.useMemo(() => {
    return services.filter((s) => {
      // Category filter (if selected)
      if (selectedCats.length > 0) {
        // Simple mapping or check
        const isMatch = selectedCats.some((cat) => s.title.toLowerCase().includes(cat.split('-')[0]));
        if (!isMatch) return false;
      }
      // Price filter (convert pence to pounds)
      const pricePounds = s.price_pence / 100;
      if (pricePounds > maxPrice) return false;

      // Rating filter
      if (s.provider.rating_avg < minRating) return false;

      // Distance filter
      if (s.distance > maxDistance) return false;

      return true;
    });
  }, [services, selectedCats, maxPrice, minRating, maxDistance]);

  const toggleCategory = (slug: string) => {
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  };

  return (
    <div className="space-y-5 py-2">
      {/* Title / Info Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {categoryName ? categoryName : 'All services'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {filteredServices.length} Providers Found near you
          </p>
        </div>
        <Link href="/" className="text-xs text-muted hover:text-ink font-semibold">
          All categories
        </Link>
      </header>

      {/* MOBILE: Horizontal Scrollable Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none lg:hidden">
        <button
          onClick={() => setShowFiltersMobile(true)}
          className="flex items-center gap-1.5 shrink-0 rounded-full border border-hairline bg-white px-3 py-1 text-xs font-medium text-ink transition hover:border-ink"
        >
          <SlidersHorizontal className="h-3 w-3" /> Filters
        </button>

        <button
          onClick={() => setMinRating(minRating === 4 ? 0 : 4)}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
            minRating >= 4 ? 'border-accent bg-accent/10 text-accent' : 'border-hairline bg-white text-muted'
          }`}
        >
          4★+
        </button>

        <button
          onClick={() => setMaxDistance(maxDistance === 5 ? 20 : 5)}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
            maxDistance <= 5 ? 'border-accent bg-accent/10 text-accent' : 'border-hairline bg-white text-muted'
          }`}
        >
          &lt; 5 Miles
        </button>

        <button
          onClick={() => setMaxPrice(maxPrice === 30 ? 100 : 30)}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
            maxPrice <= 30 ? 'border-accent bg-accent/10 text-accent' : 'border-hairline bg-white text-muted'
          }`}
        >
          &lt; £30
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-6">
        {/* DESKTOP: Sidebar Filters */}
        <aside className="hidden lg:block space-y-6 rounded-xl border border-hairline bg-white p-5 h-fit shadow-card">
          <div className="font-display font-bold text-ink border-b border-hairline pb-2 mb-4">
            FILTERS
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Categories</label>
            <div className="space-y-1.5">
              {categoriesList.map((cat) => (
                <label key={cat.slug} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat.slug)}
                    onChange={() => toggleCategory(cat.slug)}
                    className="rounded border-hairline text-accent focus:ring-accent"
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Max Price</label>
              <span className="text-sm font-extrabold text-ink">£{maxPrice}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-accent bg-hairline rounded-lg appearance-none h-1"
            />
            <div className="flex justify-between text-[10px] text-muted font-mono-utility">
              <span>£10</span>
              <span>£100</span>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Rating</label>
            <div className="space-y-1.5">
              {[
                { label: '4★ & above', val: 4 },
                { label: '3★ & above', val: 3 },
                { label: 'All Ratings', val: 0 },
              ].map((opt) => (
                <label key={opt.val} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="rating-filter"
                    checked={minRating === opt.val}
                    onChange={() => setMinRating(opt.val)}
                    className="text-accent focus:ring-accent"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Distance</label>
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="2">Within 2 Miles</option>
              <option value="5">Within 5 Miles</option>
              <option value="10">Within 10 Miles</option>
              <option value="25">Within 25 Miles</option>
            </select>
          </div>

          <Button
            onClick={() => {
              setSelectedCats([]);
              setMaxPrice(100);
              setMinRating(0);
              setMaxDistance(25);
            }}
            variant="outline"
            className="w-full text-xs py-2"
          >
            Clear Filters
          </Button>
        </aside>

        {/* Results Pane */}
        <div className="space-y-4">
          {!filteredServices.length ? (
            <EmptyState
              title="No providers found"
              description="Try adjusting your filters or search query to find available professionals."
            />
          ) : (
            <>
              {/* DESKTOP VIEW: Grid Layout */}
              <ul className="hidden lg:grid grid-cols-2 gap-4">
                {filteredServices.map((s) => (
                  <li key={s.id}>
                    <Card className="flex flex-col justify-between h-full border border-hairline bg-white p-4 rounded-xl shadow-card transition hover:border-accent">
                      <div className="flex gap-4">
                        {/* Profile Photo */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-hairline">
                          {s.provider?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-display text-base font-bold text-ink">
                              {s.provider?.full_name ?? 'Provider'}
                            </span>
                            {s.provider?.kyc_status === 'approved' && (
                              <Badge tone="success">Verified</Badge>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted">{s.title}</div>
                          <div className="mt-2 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber text-amber" />
                            <span className="text-xs font-bold text-ink">
                              {Number(s.provider?.rating_avg ?? 0).toFixed(1)}
                            </span>
                            <span className="text-xs text-muted">
                              ({s.provider?.rating_count ?? 0} reviews)
                            </span>
                          </div>
                        </div>
                      </div>

                      <hr className="my-3 border-hairline" />

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-muted uppercase font-mono-utility">Rate / Distance</div>
                          <div className="text-sm font-extrabold text-ink">
                            {pence(s.price_pence)}/hr • {s.distance} mi
                          </div>
                        </div>
                        <Link href={`/providers/${s.provider.id}`}>
                          <Button size="sm">VIEW PROFILE</Button>
                        </Link>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>

              {/* MOBILE VIEW: Vertical List Layout */}
              <ul className="lg:hidden space-y-3">
                {filteredServices.map((s) => (
                  <li key={s.id}>
                    <Card className="flex items-center gap-4 border border-hairline bg-white p-3 rounded-xl shadow-card transition hover:border-accent">
                      {/* Photo */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-hairline">
                        {s.provider?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display text-sm font-bold text-ink">
                            {s.provider?.full_name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber text-amber" />
                            {Number(s.provider?.rating_avg ?? 0).toFixed(1)}
                          </span>
                          <span>•</span>
                          <span className="font-extrabold text-ink">{pence(s.price_pence)}/hr</span>
                          <span>•</span>
                          <span>{s.distance} mi</span>
                        </div>
                      </div>

                      <Link href={`/providers/${s.provider.id}`} className="shrink-0">
                        <Button size="sm" variant="outline">
                          VIEW
                        </Button>
                      </Link>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* MOBILE: Filters Sheet Modal Overlay */}
      {showFiltersMobile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg px-4 py-6 overflow-y-auto pb-24 lg:hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <button
              aria-label="Close filters"
              onClick={() => setShowFiltersMobile(false)}
              className="tap inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden /> Close
            </button>
            <h2 className="font-display text-lg font-bold text-ink">Filters</h2>
            <button
              onClick={() => {
                setSelectedCats([]);
                setMaxPrice(100);
                setMinRating(0);
                setMaxDistance(25);
                setShowFiltersMobile(false);
              }}
              className="text-xs font-semibold text-accent hover:text-accent-hover"
            >
              Reset All
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6 py-6">
            {/* Categories */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Categories</label>
              <div className="grid grid-cols-2 gap-2">
                {categoriesList.map((cat) => {
                  const isSelected = selectedCats.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => toggleCategory(cat.slug)}
                      className={`tap rounded-xl border py-2 px-3 text-left text-xs font-medium transition ${
                        isSelected
                          ? 'border-accent bg-accent/10 text-accent font-bold'
                          : 'border-hairline bg-white text-ink'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Max Hourly Rate</label>
                <span className="text-sm font-extrabold text-ink">£{maxPrice}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-accent bg-hairline rounded-lg appearance-none h-1.5"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono-utility">
                <span>£10</span>
                <span>£100</span>
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Minimum Rating</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '4★+', val: 4 },
                  { label: '3★+', val: 3 },
                  { label: 'Any', val: 0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setMinRating(opt.val)}
                    className={`tap rounded-xl border py-2 text-center text-xs font-medium transition ${
                      minRating === opt.val
                        ? 'border-ink bg-ink text-bg'
                        : 'border-hairline bg-white text-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Maximum Distance</label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 5, 10, 25].map((dist) => (
                  <button
                    key={dist}
                    onClick={() => setMaxDistance(dist)}
                    className={`tap rounded-xl border py-2 text-center text-xs font-medium transition ${
                      maxDistance === dist
                        ? 'border-ink bg-ink text-bg'
                        : 'border-hairline bg-white text-ink'
                    }`}
                  >
                    {dist} mi
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Apply CTA */}
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
            <Button
              onClick={() => setShowFiltersMobile(false)}
              size="block"
            >
              APPLY FILTERS ({filteredServices.length} Results)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
