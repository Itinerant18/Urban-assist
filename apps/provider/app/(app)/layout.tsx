import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { AppShell, type NavItem } from '@urban-assist/ui';
import { NotificationBell } from './notification-bell';
import { PushRegistrar } from './push-registrar';
import { Briefcase, CalendarDays, Wallet, FileText, UserRound, Settings } from 'lucide-react';

const nav: NavItem[] = [
  { href: '/', label: 'Requests', icon: <Briefcase className="h-4 w-4" /> },
  { href: '/schedule', label: 'Schedule', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/earnings', label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
  { href: '/services', label: 'My Services', icon: <Settings className="h-4 w-4" /> },
  { href: '/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { href: '/account', label: 'Menu', icon: <UserRound className="h-4 w-4" /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  // Provider profile sanity check.
  const [{ data: profile }, { count }] = await Promise.all([
    db
      .from('profiles')
      .select('role,kyc_status,registration_completed')
      .eq('id', user.id)
      .single(),
    db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .is('read_at', null),
  ]);
  if (!profile || profile.role !== 'provider') redirect('/login?error=wrong_app');

  // Registration wall — /register lives outside this route group, so no loop.
  if (!profile.registration_completed) redirect('/register');

  return (
    <AppShell
      nav={nav}
      brand="Urban Assist Pro"
      headerRight={<NotificationBell initialUnread={count ?? 0} />}
    >
      <PushRegistrar />
      {children}
    </AppShell>
  );
}
