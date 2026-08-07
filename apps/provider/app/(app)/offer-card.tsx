'use client';
// Job-offer takeover: full-height sheet on mobile, centred dialog on desktop.
// Timed window to accept; a late accept is still honoured server-side while the
// booking remains unassigned.
//
// Built on the shared Dialog, which is a native <dialog> — that supplies the
// focus trap, Esc, and inert background this screen previously had none of.

import * as React from 'react';
import { Button, Dialog, Spinner } from '@urban-assist/ui';
import { pence, ukDateTime, miles, haversineKm } from '@urban-assist/lib';
import { OFFER_TTL_SECONDS } from '@urban-assist/utils/constants';
import { Clock, MapPin, ShieldAlert } from 'lucide-react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { commissionNote, offerEarnings } from '../../lib/provider-data';

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Short confirmation buzz. Progressive — silently absent where unsupported. */
function buzz(ms = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
}

export function OfferCard({ offer, onResolved }: { offer: any; onResolved: () => void }) {
  const respondsBy = new Date(offer.responds_by).getTime();
  const [secsLeft, setSecsLeft] = React.useState(Math.max(0, Math.floor((respondsBy - Date.now()) / 1000)));
  const [busy, setBusy] = React.useState<'accept' | 'decline' | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [providerLoc, setProviderLoc] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    // Fetch provider's own location to display map directions / compute distance
    const sb = supabase();
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        sb.from('provider_location')
          .select('lat, lng')
          .eq('provider_id', data.user.id)
          .single()
          .then(({ data: loc }) => {
            if (loc) setProviderLoc({ lat: loc.lat, lng: loc.lng });
          });
      }
    });
  }, []);

  // An offer that is ALREADY past its deadline when opened stays actionable —
  // auto-expiry only fires on a live countdown reaching zero, otherwise a stale
  // offer would be killed the instant the provider finally saw it.
  const initiallyStale = React.useRef(secsLeft === 0);

  React.useEffect(() => {
    if (initiallyStale.current) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((respondsBy - Date.now()) / 1000));
      setSecsLeft(left);
      if (left === 0) {
        clearInterval(t);
        fetch(`/api/offers/${offer.id}/expire`, { method: 'POST' })
          .catch(() => {})
          .finally(() => onResolved());
      }
    }, 1000);
    return () => clearInterval(t);
  }, [respondsBy, onResolved]);

  const pct = Math.max(0, Math.min(100, (secsLeft / OFFER_TTL_SECONDS) * 100));

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline');
    setErr(null);
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.error === 'provider_schedule_conflict') {
        throw new Error('You already have a job booked around this time.');
      }
      if (!res.ok) throw new Error(j.error ?? 'Failed');
      if (accept && j.result !== 'accepted') {
        // Server declined the accept (offer taken/expired) but returned 200 —
        // surface it instead of closing as if it succeeded.
        setErr('This offer is no longer available.');
        setTimeout(onResolved, 2500);
        return;
      }
      if (accept) buzz();
      onResolved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  const b = offer.booking ?? {};
  const earnings = offerEarnings(b, offer.commission_bps);
  const jobLat = b.address?.lat;
  const jobLng = b.address?.lng;
  const hasRouteCoords = providerLoc && jobLat && jobLng;

  // Both coordinate pairs were already fetched for the map; the card just showed a
  // literal "~ 2.5 Miles" regardless. Straight-line, so it reads as an approximation.
  const distanceLabel = hasRouteCoords
    ? `~ ${miles(haversineKm(providerLoc.lat, providerLoc.lng, jobLat, jobLng))}`
    : '—';

  const mapUrl = hasRouteCoords
    ? `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${providerLoc.lat},${providerLoc.lng}&destination=${jobLat},${jobLng}&zoom=12`
    : jobLat && jobLng
    ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${jobLat},${jobLng}&zoom=14`
    : null;

  return (
    <Dialog
      open
      onClose={onResolved}
      // Esc must not silently discard a live offer — the provider decides.
      dismissible={false}
      hideClose
      className="w-full sm:max-w-2xl"
    >
      <div className="-mx-5 -mt-4">
        {/* Header — ink, not accent: accent behind ink text was 2.85:1. */}
        <header className="flex items-center justify-between gap-3 bg-ink px-5 py-4 text-bg">
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            <ShieldAlert className="h-5 w-5 text-amber" aria-hidden />
            New job offer
          </h2>
          <p
            className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/15 px-2.5 py-1 font-mono-utility text-xs font-bold"
            aria-live="off"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span>{formatTimer(secsLeft)}</span>
            <span className="sr-only">remaining to respond</span>
          </p>
        </header>

        <div className="relative h-1.5 w-full bg-hairline">
          <div
            className="h-full bg-accent transition-all duration-1000"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={secsLeft}
            aria-valuemin={0}
            aria-valuemax={OFFER_TTL_SECONDS}
            aria-label="Time left to respond"
          />
        </div>
      </div>

      <div className="space-y-5 pt-5">
        <p className="text-sm text-muted">Accept before the timer runs out to secure this booking.</p>

        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-bg p-4">
          <div>
            <dt className="font-mono-utility text-[11px] uppercase text-muted">Service</dt>
            <dd className="text-sm font-semibold text-ink">{b.category?.name ?? 'Job'}</dd>
          </div>
          <div>
            <dt className="font-mono-utility text-[11px] uppercase text-muted">You earn</dt>
            {earnings ? (
              <dd>
                <span className="font-display text-lg font-bold text-success-deep">
                  {pence(earnings.net)}
                </span>
                <span className="block text-[11px] text-muted">
                  {pence(earnings.gross)} · {commissionNote(earnings.bps)}
                </span>
              </dd>
            ) : (
              <dd className="font-display text-lg font-bold text-muted">—</dd>
            )}
          </div>
          <div>
            <dt className="font-mono-utility text-[11px] uppercase text-muted">Date &amp; time</dt>
            <dd className="text-xs font-medium text-ink">{ukDateTime(b.scheduled_at)}</dd>
          </div>
          <div>
            <dt className="font-mono-utility text-[11px] uppercase text-muted">Distance</dt>
            <dd className="text-xs font-medium text-ink">{distanceLabel}</dd>
          </div>
          <div className="col-span-2">
            <dt className="font-mono-utility text-[11px] uppercase text-muted">Location</dt>
            <dd className="mt-0.5 flex items-center gap-1 text-xs font-medium text-ink">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              {[b.address?.line1, b.address?.postcode].filter(Boolean).join(', ') || '—'}
            </dd>
          </div>
        </dl>

        {mapUrl ? (
          <div className="h-48 overflow-hidden rounded-xl border border-hairline md:h-64">
            <iframe
              title="Route to the job address"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={mapUrl}
            />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl bg-hairline/30 text-sm text-muted md:h-64">
            Map preview loading…
          </div>
        )}

        {err && (
          <p role="alert" className="text-center text-sm font-medium text-danger">
            {err}
          </p>
        )}
      </div>

      {/* Footer lives in the sheet's own pinned area (safe-area padded). */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex gap-3 border-t border-hairline bg-white px-5 pt-3 safe-pb">
        <Button
          variant="outline"
          className="flex-1 py-4 font-semibold text-charcoal"
          onClick={() => respond(false)}
          disabled={!!busy}
        >
          {busy === 'decline' && <Spinner />}
          {busy === 'decline' ? 'Declining…' : 'Decline'}
        </Button>
        <Button
          className="flex-1 py-4 font-semibold"
          onClick={() => respond(true)}
          disabled={!!busy}
        >
          {busy === 'accept' && <Spinner />}
          {busy === 'accept' ? 'Accepting…' : 'Accept job'}
        </Button>
      </div>
    </Dialog>
  );
}
