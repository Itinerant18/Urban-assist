'use client';

import * as React from 'react';
import { Card, Button } from '@urban-assist/ui';
import { Star, Calendar, SlidersHorizontal, User, Clock } from 'lucide-react';
import { pence } from '@urban-assist/lib';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type ProviderService = {
  id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  description: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
    kyc_status: string;
  };
};

type ProviderListProps = {
  initialServices: ProviderService[];
  categorySlug: string;
};

export function ProviderList({ initialServices, categorySlug }: ProviderListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load initial filter states from URL search params
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(() => {
    const types = searchParams.get('types');
    return types ? types.split(',') : [];
  });
  const [maxPrice, setMaxPrice] = React.useState<number>(() => {
    const price = searchParams.get('maxPrice');
    return price ? parseInt(price, 10) : 100; // max £100
  });
  const [minRating, setMinRating] = React.useState<number>(() => {
    const rating = searchParams.get('minRating');
    return rating ? parseFloat(rating) : 0;
  });
  const [dateVal, setDateVal] = React.useState<string>(() => {
    return searchParams.get('date') ?? '';
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  // Extract unique service types (titles) dynamically
  const uniqueTypes = React.useMemo(() => {
    const set = new Set(initialServices.map((s) => s.title));
    return Array.from(set);
  }, [initialServices]);

  // Sync state changes with URL query parameters
  const updateUrl = React.useCallback(
    (types: string[], price: number, rating: number, date: string) => {
      const params = new URLSearchParams();
      if (types.length > 0) params.set('types', types.join(','));
      if (price !== 100) params.set('maxPrice', price.toString());
      if (rating > 0) params.set('minRating', rating.toString());
      if (date) params.set('date', date);

      const queryStr = params.toString();
      router.replace(`/services/${categorySlug}${queryStr ? `?${queryStr}` : ''}`, { scroll: false });
    },
    [categorySlug, router]
  );

  const handleTypeToggle = (type: string) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(next);
    updateUrl(next, maxPrice, minRating, dateVal);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const price = parseInt(e.target.value, 10);
    setMaxPrice(price);
    updateUrl(selectedTypes, price, minRating, dateVal);
  };

  const handleRatingChange = (rating: number) => {
    setMinRating(rating);
    updateUrl(selectedTypes, maxPrice, rating, dateVal);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setDateVal(date);
    updateUrl(selectedTypes, maxPrice, minRating, date);
  };

  // Filtered offerings list
  const filteredServices = React.useMemo(() => {
    return initialServices.filter((s) => {
      // 1. Service Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(s.title)) {
        return false;
      }
      // 2. Price filter (convert maxPrice £ into pence)
      if (s.price_pence > maxPrice * 100) {
        return false;
      }
      // 3. Rating filter
      if (s.profiles.rating_avg < minRating) {
        return false;
      }
      return true;
    });
  }, [initialServices, selectedTypes, maxPrice, minRating]);

  return (
    <div className="space-y-6">
      {/* Dynamic Count Header */}
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <span className="text-sm font-semibold text-muted">
          {filteredServices.length} Professionals available near you
        </span>
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="lg:hidden flex items-center gap-1.5 rounded-full border border-hairline bg-white px-4 py-2 text-xs font-bold text-ink shadow-sm"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        
        {/* DESKTOP SIDEBAR FILTERS */}
        <aside className="hidden lg:block space-y-6 sticky top-24 h-[calc(100vh-10rem)] overflow-y-auto pr-2">
          {/* Service Types */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-ink font-mono-utility uppercase tracking-wider">Service Type</h4>
            <div className="space-y-2">
              {uniqueTypes.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="rounded border-hairline text-accent focus:ring-accent"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-ink font-mono-utility uppercase tracking-wider">
              Price Range (Max: £{maxPrice})
            </h4>
            <input
              type="range"
              min={10}
              max={150}
              value={maxPrice}
              onChange={handlePriceChange}
              className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-xs text-muted font-medium">
              <span>£10</span>
              <span>£150</span>
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-ink font-mono-utility uppercase tracking-wider">Minimum Rating</h4>
            <div className="space-y-2">
              {[4, 3, 0].map((rating) => (
                <label key={rating} className="flex items-center gap-2 text-sm text-charcoal font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="minRating"
                    checked={minRating === rating}
                    onChange={() => handleRatingChange(rating)}
                    className="text-accent focus:ring-accent border-hairline"
                  />
                  <span>{rating === 0 ? 'Any Rating' : `${rating}+ Stars`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-ink font-mono-utility uppercase tracking-wider">Availability</h4>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="date"
                value={dateVal}
                onChange={handleDateChange}
                className="w-full rounded-xl border border-hairline pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-accent bg-white"
              />
            </div>
          </div>
        </aside>

        {/* MOBILE COLLAPSIBLE/SLIDE OUT FILTERS PANEL */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 bg-black/45 lg:hidden flex justify-end">
            <div className="w-[280px] bg-white h-full p-6 space-y-6 overflow-y-auto flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <h3 className="font-display font-bold text-ink text-base">Filters</h3>
                  <button onClick={() => setMobileFiltersOpen(false)} className="text-xs font-bold text-muted">
                    Close
                  </button>
                </div>

                {/* Service Types */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-ink font-mono-utility uppercase">Service Type</h4>
                  {uniqueTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm text-charcoal font-medium">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                        className="rounded border-hairline text-accent"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>

                {/* Price range */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-ink font-mono-utility uppercase">Max Price: £{maxPrice}</h4>
                  <input
                    type="range"
                    min={10}
                    max={150}
                    value={maxPrice}
                    onChange={handlePriceChange}
                    className="w-full accent-accent"
                  />
                </div>

                {/* Min rating */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-ink font-mono-utility uppercase">Min Rating</h4>
                  {[4, 3, 0].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 text-sm text-charcoal font-medium">
                      <input
                        type="radio"
                        name="mobileMinRating"
                        checked={minRating === rating}
                        onChange={() => handleRatingChange(rating)}
                        className="text-accent"
                      />
                      <span>{rating === 0 ? 'Any Rating' : `${rating}+ Stars`}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={() => setMobileFiltersOpen(false)} size="block">
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* RIGHT PROVIDERS GRID */}
        <div className="space-y-6">
          {filteredServices.length === 0 ? (
            <div className="text-center py-16 bg-white border border-hairline rounded-3xl p-6">
              <p className="text-muted text-sm">No professionals matched your current filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredServices.map((s) => {
                const rating = s.profiles.rating_avg || 5.0;
                const count = s.profiles.rating_count || 0;
                return (
                  <Card
                    key={s.id}
                    className="p-5 border border-hairline bg-white rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Provider Profile Details Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-hairline shrink-0 flex items-center justify-center font-bold text-ink border border-hairline shadow-sm">
                            {s.profiles.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-6 w-6 text-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-ink text-sm truncate">
                              {s.profiles.full_name ?? 'Professional'}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mt-0.5">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              <span>{rating.toFixed(1)}</span>
                              <span className="text-muted font-medium font-mono-utility">({count})</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Service Details */}
                      <div className="pt-3 border-t border-hairline space-y-2">
                        <h4 className="font-bold text-ink text-sm">{s.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-muted font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {s.duration_mins} mins
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions / Price Row */}
                    <div className="pt-4 border-t border-hairline flex items-center justify-between gap-3 mt-4">
                      <div>
                        <p className="text-[10px] text-muted font-bold font-mono-utility uppercase">Price</p>
                        <p className="text-lg font-extrabold text-ink leading-none mt-0.5">
                          {pence(s.price_pence)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/services/${categorySlug}/${s.id}`}>
                          <Button size="sm" variant="outline">
                            VIEW
                          </Button>
                        </Link>
                        <Link href={`/book/${s.id}`}>
                          <Button size="sm">
                            BOOK NOW
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
