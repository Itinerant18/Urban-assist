'use client';
// Customer-side booking detail + live tracking.
// Subscribes to Supabase Realtime for status / message updates.

import * as React from 'react';
import {
  Card,
  Button,
  LiveStatusTrack,
  statusToStage,
  Field,
  toast,
  BottomSheet,
  Spinner,
} from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';
import { CANCELLATION_POLICY, londonWallTimeToUtc, utcToLondonWallTime } from '@urban-assist/utils';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Banknote, Phone, MessageSquare, AlertOctagon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ChatMessage } from '@urban-assist/types';
import { StatusPill } from '../../../../components/status-pill';
import { StickyActionBar, StickyActionMeta } from '../../../../components/sticky-action-bar';
import { vatLabel } from '@urban-assist/ui';

type DisplayMessage = Pick<ChatMessage, 'id' | 'booking_id' | 'sender_id' | 'content' | 'created_at'>;

function mergeMessages(current: DisplayMessage[], incoming: DisplayMessage[]): DisplayMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function BookingDetail({
  booking: initialBooking,
  payment: initialPayment,
  hasReview = false,
  startCode,
}: {
  booking: any;
  payment: any;
  hasReview?: boolean;
  startCode: string | null;
}) {
  const router = useRouter();
  const [booking, setBooking] = React.useState(initialBooking);
  const [payment, setPayment] = React.useState(initialPayment);
  const [messages, setMessages] = React.useState<DisplayMessage[]>([]);
  const [draft, setDraft] = React.useState('');
  const [reviewed] = React.useState(hasReview);
  const [busy, setBusy] = React.useState(false);
  const [providerLoc, setProviderLoc] = React.useState<{ lat: number; lng: number } | null>(null);
  React.useEffect(() => {
    const sb = supabase();
    const ch = sb
      .channel(`booking-${booking.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${booking.id}` },
        (p) => setBooking((b: any) => ({ ...b, ...p.new })),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${booking.id}`,
        },
        (p) => setMessages((current) => mergeMessages(current, [p.new as DisplayMessage])),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `booking_id=eq.${booking.id}`,
        },
        (p) => setPayment((cur: any) => ({ ...cur, ...p.new })),
      );

    if (booking.provider_id) {
      ch.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_location',
          filter: `provider_id=eq.${booking.provider_id}`,
        },
        (p) => {
          const loc = p.new as any;
          if (loc && loc.lat && loc.lng) {
            setProviderLoc({ lat: loc.lat, lng: loc.lng });
          }
        },
      );
      // Backfill provider location
      sb.from('provider_location')
        .select('lat, lng')
        .eq('provider_id', booking.provider_id)
        .single()
        .then(({ data }) => {
          if (data) setProviderLoc({ lat: data.lat, lng: data.lng });
        });
    }

    ch.subscribe();
    // Backfill messages.
    sb.from('messages')
      .select('*')
      .eq('booking_id', booking.id)
      .order('created_at')
      .then(({ data }) => {
        setMessages((current) => mergeMessages(current, (data ?? []) as DisplayMessage[]));
      });
    return () => {
      sb.removeChannel(ch);
    };
  }, [booking.id, booking.provider_id]);

  React.useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function connectStatusStream() {
      try {
        const response = await fetch('/api/firebase/token', { method: 'POST' });
        if (!response.ok) return;
        const payload = (await response.json()) as { token?: string };
        if (!payload.token || !active) return;
        const { subscribeToBookingStatus } = await import(
          '@urban-assist/integrations/firebase/status-client'
        );
        unsubscribe = await subscribeToBookingStatus({
          bookingId: initialBooking.id,
          customToken: payload.token,
          participant: 'customer_id',
          onEvents(events) {
            const latest = events.at(-1);
            if (latest && active) {
              setBooking((current: Record<string, unknown> | null) => ({
                ...(current ?? {}),
                status: latest.status,
              }));
            }
          },
        });
      } catch (error) {
        console.warn('[urban-assist] Firebase status stream unavailable', error);
      }
    }

    void connectStatusStream();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [initialBooking.id]);

  React.useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function connectChat() {
      try {
        const response = await fetch('/api/firebase/token', { method: 'POST' });
        if (!response.ok) return;
        const payload = (await response.json()) as { token?: string };
        if (!payload.token || !active) return;
        const { subscribeToBookingChat } = await import(
          '@urban-assist/integrations/firebase/chat-client'
        );
        unsubscribe = await subscribeToBookingChat({
          bookingId: initialBooking.id,
          customToken: payload.token,
          participant: 'customer_id',
          onMessages(incoming) {
            if (active) setMessages((current) => mergeMessages(current, incoming));
          },
        });
      } catch (error) {
        console.warn('[urban-assist] Firebase chat unavailable', error);
      }
    }

    void connectChat();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [initialBooking.id]);

  const stage = statusToStage(booking.status);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft;
    setDraft('');
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id, content: body }),
    });
  }

  async function confirmCash() {
    await fetch('/api/cash-confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id }),
    });
  }

  async function retryMatching() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/retry`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Retry failed');
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('Schedule changed');

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error === 'not_cancellable'
            ? 'Too late to cancel — the provider is already on the way. Contact support.'
            : 'Could not cancel',
        );
      }
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      setCancelOpen(false);
    }
  }

  const cancellable = ['pending_match', 'unmatched', 'assigned'].includes(booking.status);
  const reschedulable = ['pending_match', 'unmatched'].includes(booking.status);
  const [reschedOpen, setReschedOpen] = React.useState(false);
  const [reschedAt, setReschedAt] = React.useState('');

  async function reschedule() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scheduled_at: londonWallTimeToUtc(reschedAt).toISOString() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error === 'invalid_time' ? 'Pick a time in the future.' : 'Could not reschedule',
        );
      }
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const needsRate = booking.status === 'completed' && !reviewed;
  const cashDue =
    booking.payment_method === 'cash' &&
    booking.status === 'completed' &&
    payment?.status !== 'succeeded';

  return (
    <div className="space-y-4 py-2 pb-28 lg:pb-2">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{booking.category?.name ?? 'Booking'}</h1>
          <p className="font-mono-utility text-muted">#{booking.short_code}</p>
        </div>
        <StatusPill status={booking.status} />
      </header>

      {booking.status === 'completed' && !reviewed && (
        <Card className="space-y-3 border-accent/25 bg-accent/5">
          <h2 className="font-display text-lg font-bold text-ink">How was your service?</h2>
          <p className="text-sm text-muted">
            A quick rating helps us improve matching — and helps great professionals get more work.
          </p>
          <Link href={`/bookings/${booking.id}/rate`}>
            <Button className="min-h-12 w-full sm:w-auto">Rate your service</Button>
          </Link>
        </Card>
      )}

      {booking.status === 'unmatched' ? (
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-danger">
            <AlertOctagon className="h-4 w-4" /> We couldn't find a provider right now.
          </div>
          <p className="text-sm text-muted">
            All eligible professionals were busy or unavailable for that window. Try matching again,
            or pick a different time.
          </p>
          {/* The second button here was a "Notify me when available" control with no
              handler and no backing subscription. Removed rather than left to
              promise an alert that would never arrive. */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={retryMatching} disabled={busy}>
              {busy ? 'Retrying…' : 'Retry matching'}
            </Button>
          </div>
        </Card>
      ) : booking.status === 'on_the_way' || booking.status === 'in_progress' ? (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-2/3">
            <Card className="p-0 overflow-hidden h-64 lg:h-96 relative">
              {providerLoc ? (
                <iframe
                  title="Map of the job address"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${providerLoc.lat},${providerLoc.lng}&zoom=15`}
                />
              ) : (
                <div className="h-full w-full bg-hairline/30 flex items-center justify-center text-muted text-sm">
                  Waiting for location…
                </div>
              )}
            </Card>
          </div>
          <div className="lg:w-1/3">
            <Card className="h-full">
              {/* Desktop version - vertical */}
              <div className="hidden lg:block h-full">
                <LiveStatusTrack stage={stage} orientation="vertical" />
              </div>
              {/* Mobile version - horizontal */}
              <div className="lg:hidden">
                <LiveStatusTrack stage={stage} orientation="horizontal" />
              </div>
            </Card>
          </div>
        </div>
      ) : ['cancelled', 'disputed'].includes(booking.status) ? null : (
        <Card>
          <LiveStatusTrack stage={stage} />
        </Card>
      )}

      {startCode && ['assigned', 'on_the_way', 'arrived'].includes(booking.status) && (
        <Card className="bg-accent/5 border-accent/20 flex flex-col items-center justify-center py-5">
          <span className="font-mono-utility text-xs text-muted">Start Verification Code</span>
          <span className="font-display text-3xl font-bold tracking-widest mt-1 text-ink">
            {startCode}
          </span>
          <p className="text-[11px] text-muted mt-2 text-center px-4">
            Provide this 4-digit code to the professional upon arrival to start the service.
          </p>
        </Card>
      )}

      <Card className="space-y-2">
        <div className="text-xs font-mono-utility text-muted">Provider</div>
        {booking.provider ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-hairline">
              {booking.provider.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={booking.provider.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1">
              <div className="font-medium">{booking.provider.full_name}</div>
              <div className="text-xs text-muted">
                ★ {Number(booking.provider.rating_avg ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="flex gap-2">
              {booking.status === 'completed' && booking.provider_service_id && (
                <Button
                  size="sm"
                  onClick={() => router.push(`/book/${booking.provider_service_id}`)}
                >
                  Book again
                </Button>
              )}
              {/* Was a Button with no handler. A call affordance that does nothing
                  is worse than none — render it only when there is a number. */}
              {booking.status !== 'completed' &&
                booking.status !== 'cancelled' &&
                booking.provider?.phone && (
                  <a
                    href={`tel:${booking.provider.phone}`}
                    className="tap inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-medium text-ink transition hover:bg-bg"
                  >
                    <Phone className="h-4 w-4" aria-hidden /> Call
                  </a>
                )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No provider matched yet.</p>
        )}
      </Card>

      <Card className="space-y-2">
        <div className="text-xs font-mono-utility text-muted">When & where</div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">{ukDateTime(booking.scheduled_at)}</p>
          {reschedulable && !reschedOpen && (
            <Button variant="outline" size="sm" onClick={() => setReschedOpen(true)}>
              Reschedule
            </Button>
          )}
        </div>

        <p className="text-sm text-muted">
          {[
            booking.address?.line1,
            booking.address?.line2,
            booking.address?.city,
            booking.address?.postcode,
          ]
            .filter(Boolean)
            .join(', ')}
        </p>
      </Card>

      <Card className="space-y-2">
        <div className="text-xs font-mono-utility text-muted">Receipt</div>
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">Service</span>
            <span>{pence(booking.price_pence)}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">{vatLabel}</span>
            <span>{pence(booking.vat_pence)}</span>
          </li>
          <li className="flex justify-between font-display text-lg">
            <span>Total</span>
            <span>{pence(booking.total_pence)}</span>
          </li>
        </ul>
        <div className="text-xs text-muted">
          Paid by {booking.payment_method === 'card' ? 'card' : 'cash'} ·{' '}
          <span className={payment?.status === 'succeeded' ? 'text-success-deep' : 'text-accent-deep'}>
            {payment?.status ?? 'pending'}
          </span>
        </div>
        {booking.payment_method === 'cash' &&
          booking.status === 'completed' &&
          payment?.status !== 'succeeded' && (
            <Button onClick={confirmCash}>
              <Banknote className="mr-2 h-4 w-4" />I paid in cash
            </Button>
          )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono-utility text-muted">
            Chat with {booking.provider?.full_name ?? 'your provider'}
          </div>
          {booking.provider?.phone && (
            <a
              href={`tel:${booking.provider.phone}`}
              className="tap flex items-center gap-1 text-xs font-medium text-accent-deep"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden /> Call
            </a>
          )}
        </div>
        <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
          {messages.length === 0 && (
            <li className="text-muted">No messages yet — say hi when you're matched.</li>
          )}
          {messages.map((m, i) => {
            const label = dayLabel(m.created_at);
            const showDivider = i === 0 || dayLabel(messages[i - 1].created_at) !== label;
            const mine = m.sender_id === booking.customer_id;
            return (
              <React.Fragment key={m.id}>
                {showDivider && (
                  <li className="py-1.5 text-center text-[11px] text-muted">{label}</li>
                )}
                <li
                  className={`flex max-w-[80%] flex-col rounded-xl px-3 py-2 ${
                    mine ? 'ml-auto bg-accent text-white' : 'mr-auto bg-bg text-ink'
                  }`}
                >
                  <span>{m.content}</span>
                  <span
                    className={`mt-0.5 self-end text-[11px] ${mine ? 'text-white/90' : 'text-muted'}`}
                  >
                    {hhmm(m.created_at)}
                  </span>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            className="tap flex-1 rounded-xl border border-hairline bg-white px-3 py-2 text-sm"
            placeholder="Message your provider"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" disabled={!draft.trim()}>
            <MessageSquare className="h-4 w-4" />
          </Button>
        </form>
      </Card>

      {needsRate && !cashDue && (
        <StickyActionBar zClassName="z-40" bottomClassName="above-tabbar">
          <StickyActionMeta label="Feedback" value="Rate your service" />
          <Link href={`/bookings/${booking.id}/rate`}>
            <Button className="min-h-12 px-5">Rate</Button>
          </Link>
        </StickyActionBar>
      )}

      {cashDue && (
        <StickyActionBar zClassName="z-40" bottomClassName="above-tabbar">
          <StickyActionMeta label="Payment" value="Cash due" />
          <Button className="min-h-12 px-5" onClick={confirmCash}>
            <Banknote className="mr-2 h-4 w-4" /> Confirm cash
          </Button>
        </StickyActionBar>
      )}

      {cancellable && (
        <Button
          variant="outline"
          className="w-full text-danger border-danger/40 hover:border-danger"
          onClick={() => setCancelOpen(true)}
          disabled={busy}
        >
          {busy ? 'Cancelling…' : 'Cancel booking'}
        </Button>
      )}

      {/* Reschedule Modal */}
      {reschedOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-ink">Reschedule Booking</h3>
            <p className="text-xs text-muted">
              Please select a new date and time for your service. Tapping reschedule will notify the
              provider or queue the job again.
            </p>

            <Field label="New Date & Time">
              <input
                type="datetime-local"
                className="w-full tap rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
                min={utcToLondonWallTime(new Date(Date.now() + 60 * 60 * 1000))}
                value={reschedAt}
                onChange={(e) => setReschedAt(e.target.value)}
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setReschedOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={reschedule} disabled={busy || !reschedAt}>
                {busy ? 'Rescheduling…' : 'Confirm New Time'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this booking?"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button variant="danger" className="flex-1" onClick={cancel} disabled={busy}>
              {busy && <Spinner />}
              {busy ? 'Cancelling…' : 'Cancel booking'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl border border-hairline bg-bg p-3 text-xs leading-relaxed text-charcoal">
            <strong className="text-ink">Cancellation policy:</strong> {CANCELLATION_POLICY}
          </p>

          <fieldset className="space-y-2">
            <legend className="mb-2 block text-xs font-bold text-ink">
              Please select a reason
            </legend>
            {['Schedule changed', 'Booked by mistake', 'Found another provider'].map((reason) => (
              <label
                key={reason}
                className="tap flex cursor-pointer items-center gap-3 rounded-xl border border-hairline px-3 py-2 hover:bg-bg"
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  checked={cancelReason === reason}
                  onChange={() => setCancelReason(reason)}
                  className="accent-danger"
                />
                <span className="text-sm font-medium text-ink">{reason}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </BottomSheet>
    </div>
  );
}

function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
