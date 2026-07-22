'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, BellDot, CheckCircle2 } from 'lucide-react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { ukDateTime } from '@urban-assist/lib';
import { Button, Card, EmptyState, Skeleton } from '@urban-assist/ui';

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
    let channel: ReturnType<typeof sb.channel> | null = null;
    let disposed = false;

    async function load() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (disposed) return;
      setNotifications(data || []);
      setLoading(false);

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
          (payload: any) =>
            setNotifications((current) => [payload.new as Notification, ...current]),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${user.id}`,
          },
          (payload: any) =>
            setNotifications((current) =>
              current.map((notification) =>
                notification.id === payload.new.id
                  ? (payload.new as Notification)
                  : notification,
              ),
            ),
        )
        .subscribe();
    }

    void load();

    return () => {
      disposed = true;
      if (channel) sb.removeChannel(channel);
    };
  }, []);

  async function markAllRead() {
    const unread = notifications.filter((notification) => !notification.read_at);
    if (unread.length === 0) return;

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at || readAt,
      })),
    );

    await supabase()
      .from('notifications')
      .update({ read_at: readAt })
      .in('id', unread.map((notification) => notification.id));
  }

  async function markRead(id: string) {
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read_at: readAt } : notification,
      ),
    );
    await supabase().from('notifications').update({ read_at: readAt }).eq('id', id);
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

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Jobs, payments, reviews, and account updates.</p>
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
          description="Jobs, payments, reviews, and account updates will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 transition-colors ${
                !notification.read_at ? 'border-accent/20 bg-accent/5' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className="pt-1">
                  {!notification.read_at ? (
                    <BellDot className="h-5 w-5 text-accent" />
                  ) : (
                    <Bell className="h-5 w-5 text-muted" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${!notification.read_at ? 'font-medium' : ''}`}>
                      {notification.payload?.title || notification.type}
                    </p>
                    <span className="ml-2 whitespace-nowrap text-[10px] text-muted">
                      {ukDateTime(notification.created_at)}
                    </span>
                  </div>
                  {notification.payload?.body && (
                    <p className="text-xs text-muted">{notification.payload.body}</p>
                  )}
                  {notification.payload?.link && (
                    <Link
                      href={notification.payload.link}
                      className="mt-1 block text-xs text-accent hover:underline"
                    >
                      View details
                    </Link>
                  )}
                </div>
                {!notification.read_at && (
                  <div className="flex items-center">
                    <Button
                      aria-label="Mark notification as read"
                      variant="ghost"
                      size="sm"
                      className="rounded-full px-3"
                      onClick={() => markRead(notification.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
