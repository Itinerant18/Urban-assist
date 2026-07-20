import type { SupabaseClient } from '@supabase/supabase-js';
import { OFFER_TTL_SECONDS } from '@urban-assist/utils/constants';
import {
  setActiveOffer, clearActiveOffer, enqueueNotification,
  acquireLock, releaseLock,
  getCached, setCached,
  providerOnlineKey, providerLocKey, bookingLockKey,
  TTL,
} from '@urban-assist/integrations/redis';
import { sendPush } from '@urban-assist/integrations/firebase';

interface Candidate {
  provider_id: string;
  distance_km: number;
  rating: number;
  acceptance_rate: number;
}

function score(c: Candidate): number {
  const distScore = Math.max(0, 1 - c.distance_km / 15);
  const ratingScore = c.rating / 5;
  return distScore * 0.5 + ratingScore * 0.3 + c.acceptance_rate * 0.2;
}

async function onlineSet(db: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const cached: string[] = [];
  const misses: string[] = [];
  for (const id of ids) {
    const ok = await getCached<string>(providerOnlineKey(id));
    if (ok === '1') cached.push(id);
    else misses.push(id);
  }
  if (!misses.length) return new Set(cached);

  const { data: profiles } = await db
    .from('profiles')
    .select('id, is_online')
    .in('id', misses);
  for (const p of profiles ?? []) {
    if (p.is_online) {
      cached.push(p.id);
      await setCached(providerOnlineKey(p.id), '1', TTL.ONLINE_STATUS);
    }
  }
  return new Set(cached);
}

async function locationMap(db: SupabaseClient, ids: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  const map = new Map<string, { lat: number; lng: number }>();
  const misses: string[] = [];
  for (const id of ids) {
    const loc = await getCached<{ lat: number; lng: number }>(providerLocKey(id));
    if (loc) map.set(id, loc);
    else misses.push(id);
  }
  if (misses.length) {
    const { data: locs } = await db
      .from('provider_location')
      .select('provider_id, lat, lng')
      .in('provider_id', misses);
    for (const l of locs ?? []) {
      map.set(l.provider_id, { lat: l.lat, lng: l.lng });
      await setCached(providerLocKey(l.provider_id), { lat: l.lat, lng: l.lng }, TTL.PROVIDER_LOC);
    }
  }
  return map;
}

export async function findCandidates(
  db: SupabaseClient,
  bookingId: string,
): Promise<Candidate[]> {
  const { data: booking, error: bErr } = await db
    .from('bookings')
    .select('id, category_id, address_id, scheduled_at, addresses!inner(lat,lng)')
    .eq('id', bookingId)
    .single();
  if (bErr || !booking) throw bErr ?? new Error('booking_not_found');

  const addr = (booking as any).addresses;
  const lat = addr?.lat ?? 51.5074;
  const lng = addr?.lng ?? -0.1278;

  const { data: services } = await db
    .from('provider_services')
    .select('provider_id, profiles!inner(id,is_online,rating_avg,acceptance_rate,kyc_status)')
    .eq('category_id', (booking as any).category_id)
    .eq('is_active', true);

  if (!services?.length) return [];

  const ids = services.map((s) => s.provider_id);

  const [online, locMap] = await Promise.all([
    onlineSet(db, ids),
    locationMap(db, ids),
  ]);

  const { data: prevOffers } = await db
    .from('booking_offers')
    .select('provider_id')
    .eq('booking_id', bookingId);
  const seen = new Set(prevOffers?.map((o) => o.provider_id) ?? []);

  const candidates: Candidate[] = [];
  for (const s of services) {
    const p: any = s.profiles;
    if (!online.has(s.provider_id) || p.kyc_status !== 'approved') continue;
    if (seen.has(s.provider_id)) continue;
    const loc = locMap.get(s.provider_id);
    const distance_km = loc ? haversineKm(lat, lng, loc.lat, loc.lng) : 10;
    candidates.push({
      provider_id: s.provider_id,
      distance_km,
      rating: Number(p.rating_avg ?? 0),
      acceptance_rate: Number(p.acceptance_rate ?? 1),
    });
  }
  return candidates
    .sort((a, b) => score(b) - score(a))
    .slice(0, 20);
}

export async function sendNextOffer(db: SupabaseClient, bookingId: string) {
  const locked = await acquireLock(bookingLockKey(bookingId));
  if (!locked) return null;
  try {
    const candidates = await findCandidates(db, bookingId);
    if (!candidates.length) {
      await db.from('bookings').update({ status: 'unmatched' }).eq('id', bookingId);
      await clearActiveOffer(bookingId);
      return null;
    }
    const next = candidates[0];

    const { count } = await db
      .from('booking_offers')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId);

    const respondsBy = new Date(Date.now() + OFFER_TTL_SECONDS * 1000).toISOString();

    const { data: offer, error } = await db
      .from('booking_offers')
      .insert({
        booking_id: bookingId,
        provider_id: next.provider_id,
        rank: (count ?? 0) + 1,
        responds_by: respondsBy,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;

    await setActiveOffer(
      bookingId,
      { offer_id: offer.id, provider_id: next.provider_id, rank: offer.rank },
      OFFER_TTL_SECONDS,
    );

    await db.from('notifications').insert({
      profile_id: next.provider_id,
      type: 'offer.new',
      payload: { booking_id: bookingId, offer_id: offer.id, responds_by: respondsBy },
    });
    enqueueNotification({
      id: offer.id,
      profile_id: next.provider_id,
      type: 'offer.new',
      payload: { booking_id: bookingId, offer_id: offer.id, responds_by: respondsBy },
    });

    return offer;
  } finally {
    await releaseLock(bookingLockKey(bookingId));
  }
}

export async function respondToOffer(
  db: SupabaseClient,
  params: {
    offerId: string;
    providerId: string;
    accept: boolean;
    declineReason?: string;
  },
) {
  const { offerId, providerId, accept, declineReason } = params;
  // Lock the offer to prevent concurrent accept/decline races
  const offerLockKey = `lock:offer:${offerId}`;
  const locked = await acquireLock(offerLockKey);
  if (!locked) throw new Error('offer_locked');
  try {
    const { data: offer, error } = await db
      .from('booking_offers')
      .select('*')
      .eq('id', offerId)
      .single();
    if (error || !offer) throw error ?? new Error('offer_not_found');
    if (offer.provider_id !== providerId) throw new Error('forbidden');
    if (offer.status !== 'pending') throw new Error('offer_no_longer_pending');
    const bookingId = offer.booking_id;
    if (new Date(offer.responds_by) < new Date()) {
      await db
        .from('booking_offers')
        .update({ status: 'expired', responded_at: new Date().toISOString() })
        .eq('id', offerId);
      const next = await sendNextOffer(db, offer.booking_id);
      return { result: 'expired' as const, next, bookingId };
    }

    if (accept) {
      const { data: assigned } = await db
        .from('bookings')
        .update({ provider_id: providerId })
        .eq('id', offer.booking_id)
        .in('status', ['pending_match', 'unmatched'])
        .is('provider_id', null)
        .select('id')
        .maybeSingle();
      if (!assigned) {
        await db
          .from('booking_offers')
          .update({ status: 'expired', responded_at: new Date().toISOString() })
          .eq('id', offerId)
          .eq('status', 'pending');
        return { result: 'expired' as const, next: null, bookingId };
      }
      await db
        .from('booking_offers')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', offerId)
        .eq('status', 'pending');
      await clearActiveOffer(offer.booking_id);
      const { data: booking } = await db
        .from('bookings')
        .select('customer_id')
        .eq('id', offer.booking_id)
        .single();
      if (booking) {
        await db.from('notifications').insert({
          profile_id: booking.customer_id,
          type: 'booking.matched',
          payload: { booking_id: offer.booking_id, provider_id: providerId },
        });
        enqueueNotification({
          id: offer.id,
          profile_id: booking.customer_id,
          type: 'booking.matched',
          payload: { booking_id: offer.booking_id, provider_id: providerId },
        });
        await sendPush(db, booking.customer_id, {
          title: 'Professional assigned',
          body: 'A professional has accepted your booking. View details in the app.',
          data: { booking_id: offer.booking_id, link: `/bookings/${offer.booking_id}` },
        }).catch((e) => console.warn('[urban-assist] push failed:', e.message));
      }
      return { result: 'accepted' as const, bookingId };
    }

    await db
      .from('booking_offers')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
        decline_reason: declineReason ?? null,
      })
      .eq('id', offerId);
    const next = await sendNextOffer(db, offer.booking_id);
    return { result: 'declined' as const, next, bookingId };
  } finally {
    await releaseLock(offerLockKey);
  }
}

export async function expireOfferIfStale(
  db: SupabaseClient,
  offerId: string,
) {
  const { data: offer } = await db
    .from('booking_offers')
    .select('*')
    .eq('id', offerId)
    .single();
  if (!offer || offer.status !== 'pending') return { changed: false };
  if (new Date(offer.responds_by) > new Date()) return { changed: false };
  await db
    .from('booking_offers')
    .update({ status: 'expired', responded_at: new Date().toISOString() })
    .eq('id', offerId);
  await sendNextOffer(db, offer.booking_id);
  return { changed: true };
}

function haversineKm(a: number, b: number, c: number, d: number): number {
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
