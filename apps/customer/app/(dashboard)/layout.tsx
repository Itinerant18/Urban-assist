import type { NavItem } from '@urban-assist/ui';
import { AppShell } from '@urban-assist/ui';
import { Home, CalendarClock, UserRound, MessageSquare, Sparkles } from 'lucide-react';
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

// Browse pages are public and own their full-width layout; everything else is
// auth-gated (middleware redirects before this layout runs for those routes).
const WIDE_ROUTES = ['/', '/services'];
const isPublicPath = (pathname: string) =>
  pathname === '/' || pathname === '/services' || pathname.startsWith('/services/');

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
          topNav={<SiteHeader right={<CartLink />} />}
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
