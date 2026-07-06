// Supabase Edge Function: notification-dispatch
// Sends push notifications via FCM for unread notifications.
// Called by DB webhook on notifications.insert or on a schedule.
//
// Deploy: supabase functions deploy notification-dispatch --no-verify-jwt
// Cron:   every 30 seconds — see supabase/config.toml

// @ts-expect-error Deno globals
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const db = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'dispatch';

  if (mode === 'dispatch') {
    // Fetch unread notifications without a corresponding fcm send attempt
    const { data: pending } = await db
      .from('notifications')
      .select('id, profile_id, type, payload, created_at')
      .is('read_at', null)
      .order('created_at', { ascending: true })
      .limit(20);

    if (!pending?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // Get FCM tokens for these users
    const profileIds = [...new Set(pending.map((n: any) => n.profile_id))];
    const { data: tokens } = await db
      .from('fcm_tokens')
      .select('profile_id, token')
      .in('profile_id', profileIds);

    const tokenMap = new Map<string, string[]>();
    for (const t of tokens ?? []) {
      const arr = tokenMap.get(t.profile_id) ?? [];
      arr.push(t.token);
      tokenMap.set(t.profile_id, arr);
    }

    let sent = 0;
    for (const notification of pending as any[]) {
      const userTokens = tokenMap.get(notification.profile_id);
      if (!userTokens?.length) continue;

      const payload = {
        type: notification.type,
        data: notification.payload,
        created_at: notification.created_at,
      };

      for (const token of userTokens) {
        try {
          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `key=${Deno.env.get('FCM_SERVER_KEY') ?? ''}`,
            },
            body: JSON.stringify({
              to: token,
              notification: {
                title: getTitle(notification.type),
                body: getBody(notification.type, notification.payload),
              },
              data: payload,
            }),
          });
          if (res.ok) sent++;
        } catch {
          /* individual token failure is non-fatal */
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response('unknown mode', { status: 400 });
});

function getTitle(type: string): string {
  const titles: Record<string, string> = {
    'offer.new': 'New Job Offer',
    'booking.matched': 'Provider Found',
    'booking.status_changed': 'Booking Updated',
    'message.new': 'New Message',
  };
  return titles[type] ?? 'Notification';
}

function getBody(type: string, payload: Record<string, unknown>): string {
  const bodies: Record<string, string> = {
    'offer.new': 'A provider has been offered your job',
    'booking.matched': 'A provider has accepted your booking',
    'booking.status_changed': 'Your booking status has been updated',
    'message.new': 'You have a new message',
  };
  return bodies[type] ?? 'You have a new notification';
}
