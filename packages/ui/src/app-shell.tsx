'use client';
// Bottom tab bar on mobile, left sidebar on desktop — same components,
// matching §5 "mobile-first single-column".

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from './cn';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /**
   * Extra route prefixes this tab owns. Without it every route that isn't itself
   * a tab destination highlights nothing, and the user loses their place —
   * `/offers` and `/jobs/:id` belong to Requests, `/settings` to Menu.
   */
  match?: string[];
}

function isActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  const owns = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
  return owns(item.href) || (item.match?.some(owns) ?? false);
}

function shouldHideBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/book/success' || pathname.endsWith('/success')) return true;
  // Booking wizard has its own sticky Next/Back + CTA bar
  if (pathname.startsWith('/book/') || pathname === '/book') return true;
  // Post-complete rating prompt is immersive
  if (/^\/bookings\/[^/]+\/rate\/?$/.test(pathname)) return true;
  return false;
}

export function AppShell({
  nav,
  brand,
  headerRight,
  children,
  hideBottomNav: hideBottomNavProp,
  wideRoutes,
  topNav,
}: {
  nav: NavItem[];
  brand: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Force-hide mobile tab bar (e.g. immersive flows). */
  hideBottomNav?: boolean;
  /** Routes (exact or prefix) whose pages own their full-width layout —
   * content renders without the default width/padding container. */
  wideRoutes?: string[];
  /** Marketplace-style top navbar. When set, it replaces the desktop sidebar
   * and the built-in headers; the mobile bottom tab bar is kept. */
  topNav?: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideBottomNav = hideBottomNavProp ?? shouldHideBottomNav(pathname);
  // ponytail: prefix list from the app; promote to a per-page slot if layouts diverge further
  const bare =
    wideRoutes?.some((r) => pathname === r || pathname?.startsWith(r + '/')) ?? false;

  return (
    <div className={cn('min-h-dvh bg-bg', !topNav && 'lg:flex')}>
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-card"
      >
        Skip to main content
      </a>
      {/* Desktop sidebar */}
      {!topNav && (
        <aside className="hidden w-60 shrink-0 border-r border-hairline px-5 py-6 lg:block">
          <div className="mb-8 font-display text-lg">{brand}</div>
          <SidebarNav items={nav} />
        </aside>
      )}
      {topNav}

      {/* Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn('flex-1 lg:pb-12', hideBottomNav ? 'pb-0' : 'pb-40')}
      >
        {!topNav && (
          <>
            <header className="flex items-center justify-between px-5 py-4 lg:hidden">
              <div className="font-display text-base">{brand}</div>
              {headerRight && <div>{headerRight}</div>}
            </header>
            {/* Desktop Header */}
            <header className="sticky top-0 z-20 hidden h-16 items-center justify-end border-b border-hairline bg-bg/95 px-10 py-4 backdrop-blur lg:flex">
              {headerRight && <div>{headerRight}</div>}
            </header>
          </>
        )}
        <div
          className={
            bare
              ? 'w-full'
              : 'mx-auto w-full max-w-2xl px-4 py-4 sm:px-6 lg:max-w-3xl lg:px-10 lg:py-8'
          }
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar — thumb zone, 48px targets */}
      {!hideBottomNav && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
          aria-label="Primary"
        >
          <ul className="mx-auto flex max-w-xl items-stretch justify-around">
            {nav.map((it) => (
              <TabLink key={it.href} item={it} />
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary">
      <ul className="space-y-1">
        {items.map((it) => {
          const active = isActive(it, pathname);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  active ? 'bg-ink text-bg' : 'text-ink hover:bg-hairline/40',
                )}
              >
                <span className="grid h-5 w-5 place-items-center">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(item, pathname);
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        className={cn(
          'tap flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold leading-tight tracking-tight',
          // accent is 4.16:1 — below AA at this size; accent-deep clears it.
          active ? 'text-accent-deep' : 'text-muted',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <span
          className={cn(
            'grid h-6 w-6 place-items-center rounded-lg',
            active && 'bg-accent/10',
          )}
        >
          {item.icon}
        </span>
        {item.label}
      </Link>
    </li>
  );
}
