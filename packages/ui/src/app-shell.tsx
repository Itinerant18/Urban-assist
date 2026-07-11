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
}

export function AppShell({
  nav,
  brand,
  children,
}: {
  nav: NavItem[];
  brand: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-hairline px-5 py-6 lg:block">
        <div className="mb-8 font-display text-lg">{brand}</div>
        <SidebarNav items={nav} />
      </aside>

      {/* Content */}
      <main className="flex-1 pb-24 lg:pb-12">
        <header className="flex items-center justify-between px-5 py-4 lg:hidden">
          <div className="font-display text-base">{brand}</div>
        </header>
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:max-w-3xl lg:px-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-xl items-stretch justify-around">
          {nav.map((it) => (
            <TabLink key={it.href} item={it} />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const active = pathname === it.href || pathname?.startsWith(it.href + '/');
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
  );
}

function TabLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname?.startsWith(item.href + '/');
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        className={cn(
          'tap flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-mono-utility',
          active ? 'text-ink' : 'text-muted',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <span className="grid h-5 w-5 place-items-center">{item.icon}</span>
        {item.label}
      </Link>
    </li>
  );
}
