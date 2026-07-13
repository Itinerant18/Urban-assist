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
} from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: Briefcase },
  { href: '/providers', label: 'Users & Providers', icon: Users },
  { href: '/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { href: '/tickets', label: 'Support', icon: TicketCheck },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function DesktopNav({ kycPending }: { kycPending: number }) {
  const pathname = usePathname();
  return (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
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
        );
      })}
    </>
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
