'use client';

import * as React from 'react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Button, EmptyState, Skeleton } from '@urban-assist/ui';
import { Bell, BellDot, CheckCircle2 } from 'lucide-react';
import { ukDateTime } from '@urban-assist/lib';
import Link from 'next/link';

type Notification = {
  id: string;
  type: string;
  payload: any;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const sb = supabase();
    
    async function load() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      
      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
        
      setNotifications(data || []);
      setLoading(false);
    }
    
    load();

    const ch = sb
      .channel('notifications-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (p: any) => setNotifications((cur) => [p.new as Notification, ...cur])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (p: any) => setNotifications((cur) => cur.map(n => n.id === p.new.id ? (p.new as Notification) : n))
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  async function markAllRead() {
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    
    const unread = notifications.filter(n => !n.read_at);
    if (unread.length === 0) return;

    // Optimistic update
    setNotifications(cur => cur.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    
    await sb
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unread.map(n => n.id));
  }

  async function markRead(id: string) {
    const sb = supabase();
    // Optimistic update
    setNotifications(cur => cur.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading notifications">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
            Updates
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Booking, payment, and account updates.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="Booking, payment, and account updates will appear here."
          icon={<Bell className="h-8 w-8 text-amber-deep" />}
        />
      ) : (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-white">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`px-4 py-3.5 transition-colors ${!n.read_at ? 'bg-accent/5' : 'hover:bg-bg/60'}`}
            >
              <div className="flex gap-4">
                <div className="pt-1">
                  {!n.read_at ? (
                    <BellDot className="h-5 w-5 text-accent" />
                  ) : (
                    <Bell className="h-5 w-5 text-muted" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${!n.read_at ? 'font-medium' : ''}`}>
                      {n.payload?.title || n.type}
                    </p>
                    <span className="text-[11px] text-muted whitespace-nowrap ml-2">
                      {ukDateTime(n.created_at)}
                    </span>
                  </div>
                  {n.payload?.body && (
                    <p className="text-xs text-muted">{n.payload.body}</p>
                  )}
                  {n.payload?.link && (
                    <Link href={n.payload.link} className="text-xs text-accent-deep hover:underline block mt-1">
                      View details
                    </Link>
                  )}
                </div>
                {!n.read_at && (
                  <div className="flex items-center">
                    <Button aria-label="Mark notification as read" variant="ghost" size="sm" className="rounded-full px-3" onClick={() => markRead(n.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
