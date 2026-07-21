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

    sb.auth.getUser().then(({ data }: any) => {
      if (!data.user || disposed) return;

      channel = sb
        .channel('provider-notifications-bell')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${data.user.id}`,
          },
          () => setUnread((count) => count + 1),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${data.user.id}`,
          },
          (payload: any) => {
            if (payload.old && !payload.old.read_at && payload.new?.read_at) {
              setUnread((count) => Math.max(0, count - 1));
            }
          },
        )
        .subscribe();
    });

    return () => {
      disposed = true;
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
