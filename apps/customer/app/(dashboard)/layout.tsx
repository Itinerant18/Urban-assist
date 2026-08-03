import type { NavItem } from '@urban-assist/ui';
import { AppShell } from '@urban-assist/ui';
import { Home, CalendarClock, UserRound, MessageSquare, Gift } from 'lucide-react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSupabaseServer } from '@urban-assist/db/server';
import { NotificationBell } from './notification-bell';
import { PushRegistrar } from './push-registrar';

const nav: NavItem[] = [
  { href: '/browse', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { href: '/bookings', label: 'Bookings', icon: <CalendarClock className="h-5 w-5" /> },
  { href: '/messages', label: 'Chat', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/referrals', label: 'Refer', icon: <Gift className="h-5 w-5" /> },
  { href: '/account', label: 'Account', icon: <UserRound className="h-5 w-5" /> },
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
  if (profile?.role !== 'customer') redirect('/api/auth/wrong-app');

  return (
    <AppShell 
      nav={nav} 
      brand="Urban Assist"
      headerRight={<NotificationBell initialUnread={count ?? 0} />}
    >
      <PushRegistrar />
      {children}
    </AppShell>
  );
}
