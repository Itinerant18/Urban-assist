import type { NavItem } from '@urban-assist/ui';
import { AppShell } from '@urban-assist/ui';
import { Home, CalendarClock, UserRound, Heart, Gift } from 'lucide-react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSupabaseServer } from '@urban-assist/db/server';
import { NotificationBell } from './notification-bell';

const nav: NavItem[] = [
  { href: '/browse', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { href: '/bookings', label: 'Bookings', icon: <CalendarClock className="h-4 w-4" /> },
  { href: '/saved', label: 'Saved', icon: <Heart className="h-4 w-4" /> },
  { href: '/referrals', label: 'Referrals', icon: <Gift className="h-4 w-4" /> },
  { href: '/account', label: 'Menu', icon: <UserRound className="h-4 w-4" /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    // Read the current URL path so we can redirect back after login
    const headersList = headers();
    const pathname = headersList.get('x-next-pathname') || headersList.get('x-invoke-path') || '/';
    redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  const [{ data: profile }, { count }] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .is('read_at', null),
  ]);
  if (profile?.role !== 'customer') redirect('/login?error=wrong_app');

  return (
    <AppShell 
      nav={nav} 
      brand="Urban Assist"
      headerRight={<NotificationBell initialUnread={count ?? 0} />}
    >
      {children}
    </AppShell>
  );
}
