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
    let cancelled = false;

    sb.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const profileId = data.user.id;

      channel = sb
        .channel('provider-notifications-bell')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${profileId}`,
          },
          () => setUnread((u) => u + 1),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${profileId}`,
          },
          (p: any) => {
            if (p.old && !p.old.read_at && p.new?.read_at) {
              setUnread((u) => Math.max(0, u - 1));
            }
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      // Remove only this channel. The customer twin calls removeAllChannels(), which
      // would also tear down the dashboard's `provider-<id>` offer subscription.
      if (channel) sb.removeChannel(channel);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className="relative tap p-2 flex items-center justify-center rounded-full hover:bg-hairline/40 transition"
    >
      <Bell className="h-5 w-5 text-ink" />
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
