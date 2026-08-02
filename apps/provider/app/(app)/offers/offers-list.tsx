'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, Badge, EmptyState, RatingStars } from '@urban-assist/ui';
import { pence, ukDateTime, miles, haversineKm } from '@urban-assist/lib';
import { Clock, MapPin, ChevronRight } from 'lucide-react';

type Filter = 'live' | 'all';

/**
 * Seconds until `iso`, floored at 0, measured against an explicit `now`.
 *
 * `now` is threaded through rather than read from Date.now() inside render: this is a
 * client component, but Next still server-renders it, so reading the clock during
 * render produces different HTML on the server and the client and React reports a
 * hydration mismatch. `now` is null until mounted, and time-dependent output is
 * suppressed until then.
 */
function secondsLeft(iso: string, now: number) {
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
}

export function OffersList({
  offers,
  providerLoc,
}: {
  offers: any[];
  providerLoc: { lat: number; lng: number } | null;
}) {
  const [filter, setFilter] = React.useState<Filter>('live');
  // null until mounted, so the server render and the first client render agree.
  // Doubles as the countdown tick for the whole list — one interval, not one per card.
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // An offer is only actionable while pending AND inside its window. The cascade
  // may not have marked it expired yet, so trust the deadline over the status.
  // Before mount there is no trustworthy clock, so fall back to the stored status.
  const live = offers.filter((o) =>
    o.status !== 'pending' ? false : now === null || secondsLeft(o.responds_by, now) > 0,
  );
  const shown = filter === 'live' ? live : offers;

  return (
    <div className="space-y-4 py-2">
      <header className="space-y-3">
        <div>
          <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
            Job Offers
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {live.length > 0
              ? `${live.length} waiting for your response`
              : 'No offers waiting right now'}
          </p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Filter offers">
          {(['live', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`tap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? 'border-ink bg-ink text-bg'
                  : 'border-hairline bg-white text-muted hover:border-ink hover:text-ink'
              }`}
            >
              {f === 'live' ? `Live (${live.length})` : `All (${offers.length})`}
            </button>
          ))}
        </div>
      </header>

      {shown.length === 0 ? (
        <EmptyState
          title={filter === 'live' ? 'No live offers' : 'No offers yet'}
          description={
            filter === 'live'
              ? 'Go online from your dashboard so new jobs reach you.'
              : 'Offers you receive will be listed here, including ones you declined.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((o) => (
            <li key={o.id}>
              <OfferRow offer={o} providerLoc={providerLoc} now={now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfferRow({
  offer,
  providerLoc,
  now,
}: {
  offer: any;
  providerLoc: { lat: number; lng: number } | null;
  now: number | null;
}) {
  const b = offer.booking ?? {};
  const left = now === null ? null : secondsLeft(offer.responds_by, now);
  const isLive = offer.status === 'pending' && (left === null || left > 0);

  const lat = b.address?.lat;
  const lng = b.address?.lng;
  const distance =
    providerLoc && lat && lng
      ? miles(haversineKm(providerLoc.lat, providerLoc.lng, lat, lng))
      : null;

  return (
    <Link
      href={`/offers/${offer.id}`}
      className="tap block focus:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-xl"
    >
      <Card
        className={`!p-4 transition hover:border-ink ${
          isLive ? 'border-accent/40 bg-accent/5' : 'bg-white'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-ink">
                {b.category?.name ?? 'Job'}
              </span>
              <OfferStatusBadge offer={offer} left={left} />
            </div>

            <p className="text-xs text-muted">{ukDateTime(b.scheduled_at)}</p>

            <p className="text-xs text-muted flex items-center gap-1 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {[b.address?.line1, b.address?.postcode].filter(Boolean).join(', ') || '—'}
              </span>
              {distance && <span className="shrink-0">· {distance}</span>}
            </p>

            {b.customer && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span>{b.customer.full_name ?? 'Customer'}</span>
                {b.customer.rating_count > 0 ? (
                  <>
                    <RatingStars value={Number(b.customer.rating_avg ?? 0)} />
                    <span>({b.customer.rating_count})</span>
                  </>
                ) : (
                  <span>· New customer</span>
                )}
              </div>
            )}
          </div>

          <div className="text-right shrink-0 space-y-1">
            <div className="font-display text-lg font-bold text-success">
              {pence(b.total_pence ?? 0)}
            </div>
            {/* left === null pre-mount: the badge still says "Awaiting you", but the
                countdown itself is withheld until there is a real clock. */}
            {isLive && left !== null && (
              <div className="flex items-center justify-end gap-1 text-[10px] font-mono-utility text-accent">
                <Clock className="h-3 w-3" />
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-muted ml-auto" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function OfferStatusBadge({ offer, left }: { offer: any; left: number | null }) {
  if (offer.status === 'pending' && (left === null || left > 0))
    return <Badge tone="accent">Awaiting you</Badge>;
  if (offer.status === 'accepted') return <Badge tone="success">Accepted</Badge>;
  if (offer.status === 'declined') return <Badge tone="danger">Declined</Badge>;
  // Pending-but-past-deadline reads as expired even before the cascade updates it.
  return <Badge>Expired</Badge>;
}
