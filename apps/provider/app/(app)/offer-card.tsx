'use client';
// Job-offer screen-locking modal (desktop) / full-screen takeover (mobile).
// Strict 90-second window to accept before routing to the next provider.

import * as React from 'react';
import { Button, Card, Badge } from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';
import { Clock, MapPin, ShieldAlert } from 'lucide-react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} MINS`;
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

  React.useEffect(() => {
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

  const pct = Math.max(0, Math.min(100, (secsLeft / 90) * 100));

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline');
    setErr(null);
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      onResolved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  const b = offer.booking ?? {};
  const jobLat = b.address?.lat;
  const jobLng = b.address?.lng;
  const hasRouteCoords = providerLoc && jobLat && jobLng;

  const mapUrl = hasRouteCoords
    ? `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${providerLoc.lat},${providerLoc.lng}&destination=${jobLat},${jobLng}&zoom=12`
    : jobLat && jobLng
    ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${jobLat},${jobLng}&zoom=14`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-y-auto">
      {/* Mobile view takeover vs Desktop modal */}
      <div className="w-full h-full md:h-auto md:max-w-2xl bg-bg flex flex-col md:rounded-2xl md:shadow-2xl md:border md:border-hairline overflow-hidden">
        {/* Header */}
        <header className="bg-accent text-ink px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-display font-bold">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
            <span>⚠️ NEW JOB OFFER</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono-utility text-xs font-bold bg-white/25 px-2.5 py-1 rounded-md border border-white/20">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimer(secsLeft)}</span>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-hairline relative">
          <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>

        {/* Body content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold text-ink">You have a new request!</h2>
            <p className="text-sm text-muted">Accept before the timer runs out to secure this booking.</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 bg-hairline/20 p-4 rounded-xl">
            <div>
              <span className="font-mono-utility text-[10px] uppercase text-muted">Service</span>
              <p className="font-semibold text-sm text-ink">{b.category?.name ?? 'Job'}</p>
            </div>
            <div>
              <span className="font-mono-utility text-[10px] uppercase text-muted">Est. Earnings</span>
              <p className="font-bold text-lg text-success">{pence(b.total_pence ?? 0)}</p>
            </div>
            <div>
              <span className="font-mono-utility text-[10px] uppercase text-muted">Date & Time</span>
              <p className="font-medium text-xs text-ink">{ukDateTime(b.scheduled_at)}</p>
            </div>
            <div>
              <span className="font-mono-utility text-[10px] uppercase text-muted">Distance</span>
              <p className="font-medium text-xs text-ink">~ 2.5 Miles</p>
            </div>
            <div className="col-span-2">
              <span className="font-mono-utility text-[10px] uppercase text-muted">Location</span>
              <p className="font-medium text-xs text-ink flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />
                {[b.address?.line1, b.address?.postcode].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          {/* Map Preview */}
          {mapUrl ? (
            <div className="h-48 md:h-64 rounded-xl overflow-hidden border border-hairline shadow-inner relative">
              <iframe
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
            <div className="h-48 md:h-64 bg-hairline/30 rounded-xl flex items-center justify-center text-sm text-muted">
              Map preview loading…
            </div>
          )}

          {err && <p className="text-sm text-danger text-center font-medium">{err}</p>}
        </div>

        {/* Footer sticky bottom buttons */}
        <footer className="border-t border-hairline bg-white p-4 flex gap-3 sticky bottom-0 z-10">
          <Button 
            variant="outline" 
            className="flex-1 py-4 font-semibold text-charcoal" 
            onClick={() => respond(false)} 
            disabled={!!busy}
          >
            {busy === 'decline' ? 'Declining…' : 'DECLINE'}
          </Button>
          <Button 
            className="flex-1 py-4 font-semibold text-white bg-accent hover:bg-accent/90" 
            onClick={() => respond(true)} 
            disabled={!!busy}
          >
            {busy === 'accept' ? 'Accepting…' : 'ACCEPT JOB'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
