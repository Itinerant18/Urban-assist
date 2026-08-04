'use client';

import Link from 'next/link';
import { MapPin, ChevronDown, ShoppingCart } from 'lucide-react';
import { ServiceSearch } from './services/service-search';

// Slim browse row: search + location + cart. AppShell owns brand and nav now,
// so this carries no logo and no nav links.
export function BrowseToolbar() {
  return (
    <div className="border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-page items-center gap-4 px-6 py-3">
        {/* Location */}
        <button className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink">
          <MapPin className="h-4 w-4 text-accent" />
          <span className="hidden sm:inline">London</span>
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>

        {/* Search */}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <ServiceSearch inputClassName="bg-bg" />
        </div>

        {/* Cart */}
        <Link
          href="/cart"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input-border bg-white"
          aria-label="Cart"
        >
          <ShoppingCart className="h-4 w-4 text-ink" />
        </Link>
      </div>
    </div>
  );
}
