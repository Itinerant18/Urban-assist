'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarClock, Grid3X3, MessageSquare, User, ShoppingCart } from 'lucide-react';
import { cn } from '@urban-assist/ui';

export type GuestTab = 'home' | 'bookings' | 'browse' | 'cart' | 'account';

const GUEST_TABS: { id: GuestTab; href: string; label: string; icon: typeof Home }[] = [
  { id: 'home', href: '/', label: 'Home', icon: Home },
  { id: 'browse', href: '/services', label: 'Browse', icon: Grid3X3 },
  { id: 'bookings', href: '/bookings', label: 'Bookings', icon: CalendarClock },
  { id: 'cart', href: '/cart', label: 'Cart', icon: ShoppingCart },
  { id: 'account', href: '/account', label: 'Account', icon: User },
];

/** Guest / marketing mobile bottom bar — matches logged-in AppShell thumb targets. */
export function GuestBottomNav({ active }: { active?: GuestTab }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around">
        {GUEST_TABS.map((item) => {
          const isActive =
            active === item.id ||
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'tap flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold tracking-wide',
                  isActive ? 'text-accent' : 'text-muted',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-lg',
                    isActive && 'bg-accent/10',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Compact “Install app” cue for capable browsers — non-blocking. */
export function PwaInstallCue() {
  return (
    <p className="lg:hidden px-4 pb-2 text-center text-[11px] text-muted">
      Add Urban Assist to your home screen for quicker booking — open Share → Add to Home Screen
      on iPhone, or the browser menu on Android.
    </p>
  );
}

export { MessageSquare };
