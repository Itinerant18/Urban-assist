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
      const profileId = data.user.id;

      channel = sb
        // Unique per mount: reusing a fixed name can return a channel still
        // tearing down from the previous mount, and .on() after subscribe() throws.
        .channel(`notifications-bell-${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}` },
          () => setUnread((u) => u + 1)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}` },
          (p: any) => {
            if (p.old && !p.old.read_at && p.new && p.new.read_at) {
              setUnread((u) => Math.max(0, u - 1));
            }
          }
        )
        .subscribe();
    });

    return () => {
      disposed = true;
      if (channel) sb.removeChannel(channel);
    };
  }, []);

  return (
    <Link href="/notifications" className="relative tap p-2 flex items-center justify-center rounded-full hover:bg-hairline/40 transition">
      <Bell className="h-5 w-5 text-ink" />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
