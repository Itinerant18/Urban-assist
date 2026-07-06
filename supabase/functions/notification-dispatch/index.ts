// Supabase Edge Function: notification-dispatch
// Uses Upstash Redis to queue + deduplicate notifications and cache FCM tokens.
//
// Deploy: supabase functions deploy notification-dispatch --no-verify-jwt
// Env:    UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, FCM_SERVER_KEY
// Cron:   every 30 seconds — see supabase/config.toml

// @ts-expect-error Deno globals
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-expect-error
import { Redis } from 'https://esm.sh/@upstash/redis@1.34.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')!;
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!;
const FCM_KEY = Deno.env.get('FCM_SERVER_KEY') ?? '';

const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

const TOKEN_CACHE_TTL = 300; // 5 min
const DONE_SET = 'notif:dispatched';
const PENDING_LIST = 'notif:pending';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'dispatch';

  if (mode === 'enqueue') {
    const { id, profile_id, type, payload } = await req.json();
    await redis.lpush(PENDING_LIST, JSON.stringify({ id, profile_id, type, payload }));
    return new Response('ok');
  }

  if (mode === 'dispatch') {
    // Pull pending notifications from the Redis queue (up to 10 per tick)
    const raw = await redis.lrange(PENDING_LIST, 0, 9);
    if (!raw?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    const pending = raw.map((r: string) => JSON.parse(r)).filter(
      (n: any) => n?.id && n?.profile_id && n?.type,
    );

    // Deduplicate: skip already-dispatched
    const unseen = pending.filter((n: any) => !redis.sismember(DONE_SET, n.id));
    if (!unseen.length) {
      await redis.ltrim(PENDING_LIST, raw.length, -1);
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // Fetch FCM tokens — cached in Redis per user
    const profileIds = [...new Set(unseen.map((n: any) => n.profile_id))];
    const tokenMap = new Map<string, string[]>();

    for (const pid of profileIds) {
      const cached = await redis.get<string[]>(`fcm:tokens:${pid}`);
      if (cached?.length) {
        tokenMap.set(pid, cached);
        continue;
      }
      const { data: tokens } = await db
        .from('fcm_tokens')
        .select('token')
        .eq('profile_id', pid);
      const list = (tokens ?? []).map((t: any) => t.token);
      if (list.length) {
        await redis.setex(`fcm:tokens:${pid}`, TOKEN_CACHE_TTL, list);
        tokenMap.set(pid, list);
      }
    }

    let sent = 0;
    const dispatched: string[] = [];
    for (const n of unseen) {
      const userTokens = tokenMap.get(n.profile_id);
      if (!userTokens?.length) continue;

      for (const token of userTokens) {
        try {
          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `key=${FCM_KEY}`,
            },
            body: JSON.stringify({
              to: token,
              notification: {
                title: getTitle(n.type),
                body: getBody(n.type, n.payload),
              },
              data: { type: n.type, data: n.payload },
            }),
          });
          if (res.ok) sent++;
        } catch {
          /* per-token failure is non-fatal */
        }
      }
      dispatched.push(n.id);
    }

    // Mark dispatched + trim queue
    if (dispatched.length) {
      for (const id of dispatched) {
        await redis.sadd(DONE_SET, id);
        await redis.expire(DONE_SET, 86400); // 24h cleanup
      }
    }
    await redis.ltrim(PENDING_LIST, raw.length, -1);

    return new Response(JSON.stringify({ sent, queued: raw.length }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response('unknown mode', { status: 400 });
});

function getTitle(type: string): string {
  const map: Record<string, string> = {
    'offer.new': 'New Job Offer',
    'booking.matched': 'Provider Found',
    'booking.status_changed': 'Booking Updated',
    'message.new': 'New Message',
  };
  return map[type] ?? 'Notification';
}

function getBody(type: string, _payload: Record<string, unknown>): string {
  const map: Record<string, string> = {
    'offer.new': 'A provider has been offered your job',
    'booking.matched': 'A provider has accepted your booking',
    'booking.status_changed': 'Your booking status has been updated',
    'message.new': 'You have a new message',
  };
  return map[type] ?? 'You have a new notification';
}
