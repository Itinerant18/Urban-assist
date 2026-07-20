// Supabase Edge Function: match-cascade
// Triggered by:
//   - On booking insert (via DB webhook → /functions/v1/match-cascade)
//   - Scheduled (cron) to expire stale offers
//
// Deploy: supabase functions deploy match-cascade --no-verify-jwt
// Cron:   `* * * * *` (every minute) — see supabase/config.toml

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
const OFFER_TTL = 90;

const db = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false },
});
const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

serve(async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'tick';

  if (mode === 'kickoff') {
    const { booking_id } = await req.json();
    await sendNext(booking_id);
    return new Response('ok');
  }

  // Tick: expire stale offers + cascade.
  const { data: stale } = await db
    .from('booking_offers')
    .select('id, booking_id')
    .eq('status', 'pending')
    .lt('responds_by', new Date().toISOString());

  for (const offer of stale ?? []) {
    await db
      .from('booking_offers')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', offer.id);
    await sendNext(offer.booking_id);
  }

  return new Response(JSON.stringify({ expired: stale?.length ?? 0 }), {
    headers: { 'content-type': 'application/json' },
  });
});

async function onlineSet(ids: string[]): Promise<Set<string>> {
  const online: string[] = [];
  const misses: string[] = [];
  for (const id of ids) {
    const ok = await redis.get(`provider:online:${id}`);
    if (ok === '1') online.push(id);
    else misses.push(id);
  }
  if (!misses.length) return new Set(online);

  const { data: profiles } = await db
    .from('profiles')
    .select('id, is_online')
    .in('id', misses);
  for (const p of profiles ?? []) {
    if (p.is_online) {
      online.push(p.id);
      await redis.setex(`provider:online:${p.id}`, 60, '1');
    }
  }
  return new Set(online);
}

async function locationMap(ids: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  const map = new Map<string, { lat: number; lng: number }>();
  const misses: string[] = [];
  for (const id of ids) {
    const raw = await redis.get<{ lat: number; lng: number }>(`provider:loc:${id}`);
    if (raw) map.set(id, raw);
    else misses.push(id);
  }
  if (misses.length) {
    const { data: locs } = await db
      .from('provider_location')
      .select('provider_id, lat, lng')
      .in('provider_id', misses);
    for (const l of locs ?? []) {
      map.set(l.provider_id, { lat: l.lat, lng: l.lng });
      await redis.setex(`provider:loc:${l.provider_id}`, 300, { lat: l.lat, lng: l.lng });
    }
  }
  return map;
}

async function acquireLock(key: string, ttl = 5): Promise<boolean> {
  const ok = await redis.set(key, '1', { nx: true, ex: ttl });
  return ok === 'OK';
}

async function releaseLock(key: string) {
  await redis.del(key);
}

async function sendNext(bookingId: string) {
  const lockKey = `lock:booking:${bookingId}`;
  const locked = await acquireLock(lockKey);
  if (!locked) return;

  try {
    const { data: booking } = await db
      .from('bookings')
      .select('id, category_id, address_id, scheduled_at, addresses!inner(lat,lng)')
      .eq('id', bookingId)
      .single();
    if (!booking) return;
    const lat = (booking as any).addresses?.lat ?? 51.5074;
    const lng = (booking as any).addresses?.lng ?? -0.1278;

    const { data: services } = await db
      .from('provider_services')
      .select('provider_id, profiles!inner(id,rating_avg,acceptance_rate,kyc_status)')
      .eq('category_id', (booking as any).category_id)
      .eq('is_active', true);
    if (!services?.length) {
      await db.from('bookings').update({ status: 'unmatched' }).eq('id', bookingId);
      return;
    }

    const ids = services.map((s: any) => s.provider_id);
    const [online, locMap] = await Promise.all([
      onlineSet(ids),
      locationMap(ids),
    ]);

    const { data: prev } = await db
      .from('booking_offers')
      .select('provider_id')
      .eq('booking_id', bookingId);
    const seen = new Set((prev ?? []).map((o: any) => o.provider_id));

    let cands = (services as any[])
      .filter((s: any) => {
        const pid = s.profiles?.id ?? s.provider_id;
        return online.has(pid) && s.profiles?.kyc_status === 'approved' && !seen.has(s.provider_id);
      })
      .map((s: any) => {
        const loc = locMap.get(s.provider_id);
        const distance_km = loc ? hav(lat, lng, loc.lat, loc.lng) : 10;
        const distScore = Math.max(0, 1 - distance_km / 15);
        const rating = Number(s.profiles.rating_avg ?? 0) / 5;
        const accept = Number(s.profiles.acceptance_rate ?? 1);
        return { id: s.provider_id, score: distScore * 0.5 + rating * 0.3 + accept * 0.2 };
      })
      .sort((a: any, b: any) => b.score - a.score);

    // Availability filter — skipped when the booking has no scheduled time.
    const scheduledAt = (booking as any).scheduled_at;
    if (scheduledAt && cands.length) {
      // Bookings are UK-only: derive the booking's local calendar date, weekday
      // and wall-clock time in Europe/London via Intl (no tz library needed).
      // en-CA gives ISO YYYY-MM-DD; h23 gives HH:MM:SS matching Postgres `time` text.
      const when = new Date(scheduledAt);
      const dateStr = when.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const timeStr = when.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hourCycle: 'h23' });
      const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0=Sunday, same as availability_slots.weekday

      const candIds = cands.map((c: any) => c.id);
      const [{ data: offs }, { data: slots }] = await Promise.all([
        db
          .from('time_off')
          .select('provider_id')
          .in('provider_id', candIds)
          .lte('start_date', dateStr)
          .gte('end_date', dateStr),
        db
          .from('availability_slots')
          .select('provider_id, weekday, start_time, end_time')
          .in('provider_id', candIds),
      ]);

      const away = new Set((offs ?? []).map((o: any) => o.provider_id));
      const hasSlots = new Set((slots ?? []).map((s: any) => s.provider_id));
      const fits = new Set(
        (slots ?? [])
          .filter((s: any) => s.weekday === weekday && s.start_time <= timeStr && s.end_time >= timeStr)
          .map((s: any) => s.provider_id),
      );

      // ponytail: no slots defined = always available; flip to opt-in once all providers set hours
      cands = cands.filter((c: any) => !away.has(c.id) && (!hasSlots.has(c.id) || fits.has(c.id)));
    }

    if (!cands.length) {
      await db.from('bookings').update({ status: 'unmatched' }).eq('id', bookingId);
      return;
    }

    const { count } = await db
      .from('booking_offers')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId);

    const respondsBy = new Date(Date.now() + OFFER_TTL * 1000).toISOString();
    const { data: offer } = await db
      .from('booking_offers')
      .insert({
        booking_id: bookingId,
        provider_id: cands[0].id,
        rank: (count ?? 0) + 1,
        responds_by: respondsBy,
        status: 'pending',
      })
      .select()
      .single();

    await redis.setex(`offer:active:${bookingId}`, OFFER_TTL, {
      offer_id: offer?.id,
      provider_id: cands[0].id,
      rank: (count ?? 0) + 1,
    });

    await db.from('notifications').insert({
      profile_id: cands[0].id,
      type: 'offer.new',
      payload: { booking_id: bookingId, offer_id: offer?.id, responds_by: respondsBy },
    });
  } finally {
    await releaseLock(lockKey);
  }
}

function hav(a: number, b: number, c: number, d: number) {
  const R = 6371;
  const dLat = ((c - a) * Math.PI) / 180;
  const dLng = ((d - b) * Math.PI) / 180;
  const lat1 = (a * Math.PI) / 180;
  const lat2 = (c * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
