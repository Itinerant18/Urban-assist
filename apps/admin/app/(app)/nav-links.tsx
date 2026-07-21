'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  TicketCheck,
  ScrollText,
  MoreHorizontal,
  Wallet,
  CalendarDays,
  Star,
  BarChart3,
  Tag,
  Percent,
  LayoutGrid,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/bookings', label: 'Bookings', icon: Briefcase },
      { href: '/scheduling', label: 'Scheduling', icon: CalendarDays },
      { href: '/services', label: 'Services', icon: LayoutGrid },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/providers', label: 'Providers', icon: Users },
      { href: '/customers', label: 'Customers', icon: UserRound },
      { href: '/staff', label: 'Staff', icon: Users },
      { href: '/kyc', label: 'KYC Queue', icon: ShieldCheck },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/financials', label: 'Financials', icon: Wallet },
      { href: '/pricing', label: 'Pricing', icon: Percent },
      { href: '/promotions', label: 'Promotions', icon: Tag },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/ratings', label: 'Ratings', icon: Star },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/audit', label: 'Audit Logs', icon: ScrollText },
    ],
  },
  {
    label: 'Support',
    items: [{ href: '/tickets', label: 'Tickets', icon: TicketCheck }],
  },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' || pathname === '/dashboard' : pathname.startsWith(href);
}

export function DesktopNav({ kycPending }: { kycPending: number }) {
  const pathname = usePathname();
  return (
    <div className="space-y-1">
      {navSections.map((section) => (
        <div key={section.label}>
          <p className="text-[10px] uppercase tracking-wider text-muted px-2 mt-4 mb-1 first:mt-0">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-2 py-2 min-h-[40px] rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-accent/10 font-semibold text-ink'
                      : 'text-ink hover:bg-hairline/40'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : 'text-muted'}`}
                  />
                  <span className="flex-1">{label}</span>
                  {href === '/kyc' && kycPending > 0 && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                      {kycPending}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const mobileNav = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/kyc', label: 'KYC', icon: ShieldCheck },
  { href: '/tickets', label: 'Tickets', icon: TicketCheck },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function MobileNav({ kycPending }: { kycPending: number }) {
  const pathname = usePathname();
  return (
    <ul className="flex justify-around items-center">
      {mobileNav.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-3 min-h-[40px] justify-center text-[10px] font-mono ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon className="h-5 w-5" />
              {href === '/kyc' && kycPending > 0 && (
                <span className="absolute -top-1 right-0.5 rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-white">
                  {kycPending}
                </span>
              )}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
