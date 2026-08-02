'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, RatingStars } from '@urban-assist/ui';
import { pence, ukDateTime, miles, haversineKm } from '@urban-assist/lib';
import { Clock, MapPin, ArrowLeft, AlertCircle } from 'lucide-react';
import { splitCommission } from '../../../../lib/provider-data';

/**
 * Reasons written to booking_offers.decline_reason, which already exists and is
 * already accepted by PATCH /api/offers/[id] — no schema or route change needed.
 */
const DECLINE_REASONS = [
  { value: 'too_far', label: 'Too far away' },
  { value: 'time_conflict', label: 'Clashes with another job' },
  { value: 'category_mismatch', label: "Not a service I offer" },
  { value: 'price_too_low', label: 'Price too low' },
  { value: 'other', label: 'Other' },
] as const;

export function OfferDetail({
  offer,
  providerLoc,
  commissionBps,
}: {
  offer: any;
  providerLoc: { lat: number; lng: number } | null;
  commissionBps: number;
}) {
  const router = useRouter();
  const b = offer.booking ?? {};

  // null until mounted. A useState initializer still runs during the server render,
  // so seeding this from Date.now() gives the server and the client different HTML
  // and React reports a hydration mismatch.
  const [secsLeft, setSecsLeft] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState<'accept' | 'decline' | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [declining, setDeclining] = React.useState(false);
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    if (offer.status !== 'pending') return;
    const remaining = () =>
      Math.max(0, Math.floor((new Date(offer.responds_by).getTime() - Date.now()) / 1000));
    setSecsLeft(remaining());
    const t = setInterval(() => setSecsLeft(remaining()), 1000);
    return () => clearInterval(t);
  }, [offer.responds_by, offer.status]);

  // Pre-mount, trust the stored status: an offer the server says is pending renders
  // as actionable, and the countdown appears once there is a real clock.
  const isLive = offer.status === 'pending' && (secsLeft === null || secsLeft > 0);

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline');
    setErr(null);
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accept,
          decline_reason: accept ? null : reason || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? 'Could not send your response');

      // The engine may report `expired` even on an accept, if another provider took
      // the job first. Saying "accepted" there would be a lie.
      if (accept && j.result === 'accepted') {
        router.push(`/jobs/${offer.booking_id}`);
        return;
      }
      if (accept && j.result === 'expired') {
        setErr('This job was taken by another provider.');
        setBusy(null);
        router.refresh();
        return;
      }
      router.push('/offers');
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setBusy(null);
    }
  }

  const gross = b.total_pence ?? 0;
  const { commission, net } = splitCommission(gross, commissionBps);

  const lat = b.address?.lat;
  const lng = b.address?.lng;
  const distance =
    providerLoc && lat && lng
      ? miles(haversineKm(providerLoc.lat, providerLoc.lng, lat, lng))
      : null;

  const mapUrl =
    lat && lng
      ? providerLoc
        ? `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${providerLoc.lat},${providerLoc.lng}&destination=${lat},${lng}&zoom=12`
        : `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${lat},${lng}&zoom=14`
      : null;

  return (
    <div className="space-y-4 py-2 pb-28 lg:pb-4">
      <Link
        href="/offers"
        className="tap inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All offers
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
            {b.category?.name ?? 'Job offer'}
          </h1>
          {isLive ? (
            <Badge tone="accent">
              <Clock className="h-3 w-3" />
              {secsLeft === null
                ? 'Awaiting you'
                : `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')} left`}
            </Badge>
          ) : offer.status === 'accepted' ? (
            <Badge tone="success">Accepted</Badge>
          ) : offer.status === 'declined' ? (
            <Badge tone="danger">Declined</Badge>
          ) : (
            <Badge>Expired</Badge>
          )}
        </div>
        <p className="text-sm text-muted">{ukDateTime(b.scheduled_at)}</p>
      </header>

      {/* Payment breakdown — commission was previously invisible to providers. */}
      <Card className="!p-4 bg-white space-y-2">
        <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
          What you earn
        </h2>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Job total</dt>
            <dd className="font-mono-utility">{pence(gross)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">
              Platform commission {commissionBps > 0 && `(${(commissionBps / 100).toFixed(1)}%)`}
            </dt>
            <dd className="font-mono-utility text-danger">−{pence(commission)}</dd>
          </div>
          <div className="flex justify-between border-t border-hairline pt-1.5">
            <dt className="font-semibold text-ink">You receive</dt>
            <dd className="font-display font-bold text-success">{pence(net)}</dd>
          </div>
        </dl>
        <p className="text-[10px] text-muted">
          Paid by {b.payment_method === 'cash' ? 'cash on completion' : 'card'}.
        </p>
      </Card>

      {/* Location */}
      <Card className="!p-4 bg-white space-y-3">
        <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
          Where
        </h2>
        <p className="text-sm text-ink flex items-start gap-1.5">
          <MapPin className="h-4 w-4 shrink-0 text-muted mt-0.5" />
          <span>
            {[b.address?.line1, b.address?.line2, b.address?.city, b.address?.postcode]
              .filter(Boolean)
              .join(', ') || 'Address available after accepting'}
            {distance && <span className="block text-xs text-muted mt-0.5">{distance} away</span>}
          </span>
        </p>
        {mapUrl && (
          <div className="h-48 rounded-xl overflow-hidden border border-hairline">
            <iframe
              title="Job location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapUrl}
            />
          </div>
        )}
      </Card>

      {/* Customer + notes */}
      <Card className="!p-4 bg-white space-y-3">
        <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
          Customer
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink">{b.customer?.full_name ?? 'Customer'}</span>
          {b.customer?.rating_count > 0 ? (
            <>
              <RatingStars value={Number(b.customer.rating_avg ?? 0)} />
              <span className="text-xs text-muted">({b.customer.rating_count})</span>
            </>
          ) : (
            <Badge>New customer</Badge>
          )}
        </div>
        {b.notes && (
          <div className="rounded-xl bg-bg/60 p-3">
            <p className="font-mono-utility text-[10px] uppercase tracking-wider text-muted mb-1">
              Notes from customer
            </p>
            <p className="text-sm text-charcoal whitespace-pre-wrap">{b.notes}</p>
          </div>
        )}
      </Card>

      {offer.status === 'declined' && offer.decline_reason && (
        <p className="text-xs text-muted">
          You declined this offer:{' '}
          {DECLINE_REASONS.find((r) => r.value === offer.decline_reason)?.label ??
            offer.decline_reason}
        </p>
      )}

      {err && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {err}
        </p>
      )}

      {isLive && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-hairline bg-white p-4 lg:static lg:border-0 lg:bg-transparent lg:p-0">
          {declining ? (
            <div className="space-y-3">
              <fieldset>
                <legend className="text-xs font-semibold text-ink mb-2">
                  Why are you declining?
                </legend>
                <div className="flex flex-wrap gap-2">
                  {DECLINE_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      aria-pressed={reason === r.value}
                      className={`tap rounded-full border px-3 py-1.5 text-xs transition ${
                        reason === r.value
                          ? 'border-ink bg-ink text-bg'
                          : 'border-hairline bg-white text-muted hover:border-ink hover:text-ink'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeclining(false)}
                  disabled={!!busy}
                >
                  Back
                </Button>
                <Button className="flex-1" onClick={() => respond(false)} disabled={!!busy}>
                  {busy === 'decline' ? 'Declining…' : 'Confirm decline'}
                </Button>
              </div>
              <p className="text-[10px] text-muted text-center">
                Declining is optional to explain, but it helps us send you better jobs.
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 py-4"
                onClick={() => setDeclining(true)}
                disabled={!!busy}
              >
                Decline
              </Button>
              <Button className="flex-1 py-4" onClick={() => respond(true)} disabled={!!busy}>
                {busy === 'accept' ? 'Accepting…' : 'Accept job'}
              </Button>
            </div>
          )}
        </div>
      )}

      {!isLive && offer.status === 'accepted' && (
        <Link href={`/jobs/${offer.booking_id}`}>
          <Button className="w-full">Open job</Button>
        </Link>
      )}
    </div>
  );
}
