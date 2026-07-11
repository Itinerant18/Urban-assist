import Link from 'next/link';
import { MapPin, ShoppingCart, User, ChevronDown } from 'lucide-react';
import { ServiceSearch } from './services/service-search';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-page items-center gap-4 px-6 py-3">
        {/* Logo placeholder */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="block h-9 w-9 rounded-[9px] bg-hairline" />
          <span className="hidden text-[15px] font-extrabold text-ink sm:inline">
            Urban Assist
          </span>
        </Link>

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

        {/* Nav links */}
        <nav className="hidden items-center gap-6 text-[15px] lg:flex">
          <Link href="/" className="font-bold text-ink" style={{ borderBottom: '2px solid #C1622E' }}>
            Home
          </Link>
          <Link href="/services" className="font-medium text-muted hover:text-ink">
            Services
          </Link>
          <Link href="/bookings" className="font-medium text-muted hover:text-ink">
            Bookings
          </Link>
        </nav>

        {/* Icon buttons */}
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input-border bg-white"
          aria-label="Cart"
        >
          <ShoppingCart className="h-4 w-4 text-ink" />
        </button>
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input-border bg-white"
          aria-label="Account"
        >
          <User className="h-4 w-4 text-ink" />
        </button>
      </div>
    </header>
  );
}
