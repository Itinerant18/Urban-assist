'use client';

import * as React from 'react';
import Link from 'next/link';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Card, Button, EmptyState, Skeleton } from '@urban-assist/ui';
import { Bell, BellDot, CheckCircle2 } from 'lucide-react';
import { ukDateTime } from '@urban-assist/lib';
import { notificationView } from '../../../lib/notification-view';

interface Notification {
  id: string;
  type: string;
  payload: any;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const sb = supabase();
    let channel: ReturnType<typeof sb.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (cancelled || !user) {
        setLoading(false);
        return;
      }

      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;
      setNotifications((data as Notification[]) ?? []);
      setLoading(false);

      // Filtered by profile_id: RLS already scopes reads, but an unfiltered
      // subscription would still wake this component on every row in the table.
      channel = sb
        .channel('provider-notifications-page')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${user.id}`,
          },
          (p: any) => setNotifications((cur) => [p.new as Notification, ...cur]),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${user.id}`,
          },
          (p: any) =>
            setNotifications((cur) =>
              cur.map((n) => (n.id === p.new.id ? (p.new as Notification) : n)),
            ),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) sb.removeChannel(channel);
    };
  }, []);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    const readAt = new Date().toISOString();
    // Optimistic: the row is already gated to read_at by grant (migration 0019).
    setNotifications((cur) =>
      cur.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? readAt } : n)),
    );
    await supabase().from('notifications').update({ read_at: readAt }).in('id', ids);
  }

  const unread = notifications.filter((n) => !n.read_at);

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
            Notifications
          </h1>
          {unread.length > 0 && (
            <p className="text-xs text-muted mt-0.5">{unread.length} unread</p>
          )}
        </div>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markRead(unread.map((n) => n.id))}>
            Mark all read
          </Button>
        )}
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          description="Job offers, schedule changes, reviews and payouts will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const view = notificationView(n.type, n.payload);
            const isUnread = !n.read_at;

            const body = (
              <div className="flex gap-3">
                <div className="pt-0.5">
                  {isUnread ? (
                    <BellDot className="h-5 w-5 text-accent" />
                  ) : (
                    <Bell className="h-5 w-5 text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm text-ink ${isUnread ? 'font-semibold' : ''}`}>
                      {view.title}
                    </p>
                    <span className="text-[10px] text-muted whitespace-nowrap font-mono-utility">
                      {ukDateTime(n.created_at)}
                    </span>
                  </div>
                  {view.body && <p className="text-xs text-muted">{view.body}</p>}
                </div>
                {isUnread && (
                  <button
                    type="button"
                    aria-label="Mark as read"
                    className="tap self-start rounded-full p-1 text-muted hover:text-ink"
                    onClick={(e) => {
                      // Sits inside the card link when one exists.
                      e.preventDefault();
                      e.stopPropagation();
                      void markRead([n.id]);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );

            return (
              <Card
                key={n.id}
                className={`!p-4 transition-colors ${
                  isUnread ? 'bg-accent/5 border-accent/20' : 'bg-white'
                }`}
              >
                {view.href ? (
                  <Link href={view.href} onClick={() => markRead([n.id])} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
