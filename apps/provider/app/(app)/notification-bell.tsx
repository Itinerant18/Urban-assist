'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = React.useState(initialUnread);

  React.useEffect(() => {
    const sb = supabase();
    let channel: ReturnType<typeof sb.channel> | null = null;
    let disposed = false;

    let refetchTimer: ReturnType<typeof setTimeout> | null = null;

    sb.auth.getUser().then(({ data }: any) => {
      if (!data.user || disposed) return;
      const uid = data.user.id;

      // UPDATE payloads don't carry old.read_at without REPLICA IDENTITY FULL,
      // so decrementing from the event is unreliable — refetch the real count,
      // coalesced so "mark all read" (N updates) costs one query.
      const refetchCount = () => {
        if (refetchTimer) clearTimeout(refetchTimer);
        refetchTimer = setTimeout(async () => {
          const { count } = await sb
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', uid)
            .is('read_at', null);
          if (!disposed) setUnread(count ?? 0);
        }, 300);
      };

      channel = sb
        // Unique per mount: reusing a fixed name can return a channel still
        // tearing down from the previous mount, and .on() after subscribe() throws.
        .channel(`provider-notifications-bell-${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${uid}`,
          },
          () => setUnread((count) => count + 1),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${uid}`,
          },
          refetchCount,
        )
        .subscribe();
    });

    return () => {
      disposed = true;
      if (refetchTimer) clearTimeout(refetchTimer);
      if (channel) sb.removeChannel(channel);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative tap flex items-center justify-center rounded-full p-2 transition hover:bg-hairline/40"
    >
      <Bell className="h-5 w-5 text-ink" />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
