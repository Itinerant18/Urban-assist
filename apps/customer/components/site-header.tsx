'use client';
// Urban-Company-style top navbar: logo · location · search · nav links · actions.
// The customer app's desktop nav — AppShell's bottom tab bar covers mobile.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, ChevronDown } from 'lucide-react';
import { ServiceSearch } from './services/service-search';
import { Logo, cn } from '@urban-assist/ui';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/bookings', label: 'Bookings' },
];

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-page items-center gap-4 px-4 py-3 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Logo />
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

        {/* Nav links — desktop only; mobile has the bottom tab bar */}
        <nav className="hidden items-center gap-6 text-[15px] lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== '/' && pathname?.startsWith(link.href + '/'));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'border-b-2 pb-0.5 transition-colors',
                  active
                    ? 'border-accent font-bold text-ink'
                    : 'border-transparent font-medium text-muted hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions (cart, notifications, account) */}
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
