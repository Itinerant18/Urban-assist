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
} from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: Briefcase },
  {
    href: '/providers',
    label: 'Users & Providers',
    icon: Users,
    sub: [
      { href: '/customers', label: 'Customers' },
      { href: '/staff', label: 'Staff Roles' }
    ]
  },
  { href: '/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { href: '/scheduling', label: 'Scheduling', icon: CalendarDays },
  { href: '/ratings', label: 'Ratings', icon: Star },
  { href: '/tickets', label: 'Support', icon: TicketCheck },
  { href: '/financials', label: 'Financials', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function DesktopNav({ kycPending }: { kycPending: number }) {
  const pathname = usePathname();
  return (
    <div className="space-y-1.5">
      {nav.map(({ href, label, icon: Icon, sub }) => {
        const active = isActive(pathname, href);
        return (
          <div key={href} className="flex flex-col">
            <Link
              href={href}
              className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-accent/10 font-semibold text-ink' : 'text-ink hover:bg-hairline/40'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : 'text-muted'}`} />
              <span className="flex-1">{label}</span>
              {href === '/kyc' && kycPending > 0 && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  {kycPending}
                </span>
              )}
            </Link>
            {sub && (
              <div className="pl-6 mt-1 flex flex-col gap-1 border-l border-hairline ml-4">
                {sub.map((s) => {
                  const subActive = pathname.startsWith(s.href);
                  return (
                    <Link
                      key={s.href}
                      href={s.href}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        subActive ? 'font-semibold text-accent' : 'text-muted hover:text-ink'
                      }`}
                    >
                      ↳ {s.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
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
              className={`relative flex flex-col items-center gap-0.5 px-3 text-[10px] font-mono-utility ${
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
