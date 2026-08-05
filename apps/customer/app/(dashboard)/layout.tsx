import type { NavItem } from '@urban-assist/ui';
import { AppShell } from '@urban-assist/ui';
import { Home, CalendarClock, UserRound, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSupabaseServer } from '@urban-assist/db/server';
import { NotificationBell } from './notification-bell';
import { PushRegistrar } from './push-registrar';
import { CartLink } from '../../components/cart-link';
import { LoginCard } from '../../components/login-card';
import { SiteHeader } from '../../components/site-header';

const nav: NavItem[] = [
  { href: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { href: '/services', label: 'Services', icon: <Sparkles className="h-5 w-5" /> },
  { href: '/bookings', label: 'Bookings', icon: <CalendarClock className="h-5 w-5" /> },
  { href: '/messages', label: 'Chat', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/account', label: 'Account', icon: <UserRound className="h-5 w-5" /> },
];

// Discovery is anonymous: home, the marketing catalogue, search results and
// provider profiles. Must stay in step with middleware's PROTECTED_PREFIXES —
// a route missing here still bounces guests to the login card.
const WIDE_ROUTES = ['/', '/services'];
const PUBLIC_PREFIXES = ['/services', '/browse', '/providers'];
const isPublicPath = (pathname: string) =>
  pathname === '/' ||
  PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();

  const headersList = headers();
  const pathname = headersList.get('x-next-pathname') || headersList.get('x-invoke-path') || '/';

  if (!user) {
    if (isPublicPath(pathname)) {
      return (
        <AppShell
          nav={nav}
          brand="Urban Assist"
          wideRoutes={WIDE_ROUTES}
          topNav={
            <SiteHeader
              right={
                <>
                  <CartLink />
                  <Link
                    href="/login"
                    className="tap inline-flex items-center rounded-full border border-hairline px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                  >
                    Sign in
                  </Link>
                </>
              }
            />
          }
        >
          {children}
        </AppShell>
      );
    }
    return (
      <div className="mx-auto max-w-xl px-5 py-12">
        <LoginCard redirectTo={pathname} />
      </div>
    );
  }

  const [{ data: profile }, { count }] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .is('read_at', null),
  ]);
  // Non-customers may still view the public browse pages; the wrong-app
  // bounce only applies to customer-only surfaces.
  if (profile?.role !== 'customer' && !isPublicPath(pathname)) redirect('/api/auth/wrong-app');

  return (
    <AppShell
      nav={nav}
      brand="Urban Assist"
      wideRoutes={WIDE_ROUTES}
      topNav={
        <SiteHeader
          right={
            <>
              <CartLink />
              <NotificationBell initialUnread={count ?? 0} />
            </>
          }
        />
      }
    >
      <PushRegistrar />
      {children}
    </AppShell>
  );
}
