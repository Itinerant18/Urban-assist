'use client';
// Customer-side booking detail + live tracking.
// Subscribes to Supabase Realtime for status / message updates.

import * as React from 'react';
import {
  Card,
  Badge,
  Button,
  LiveStatusTrack,
  statusToStage,
  RatingInput,
  EmptyState,
  Field,
} from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Banknote, Phone, MessageSquare, AlertOctagon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import type { ChatMessage } from '@urban-assist/types';

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
  const [rating, setRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewed, setReviewed] = React.useState(hasReview);
  const [busy, setBusy] = React.useState(false);
  const [dismissedReview, setDismissedReview] = React.useState(false);
  const [selectedTip, setSelectedTip] = React.useState<string | null>(null);
  const [customTip, setCustomTip] = React.useState<string>('');
  const [providerLoc, setProviderLoc] = React.useState<{ lat: number; lng: number } | null>(null);

  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [stripePromise] = React.useState(() =>
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'),
  );
  const [cardElement, setCardElement] = React.useState<any>(null);

  React.useEffect(() => {
    if (selectedTip && typeof window !== 'undefined') {
      let active = true;
      const initStripe = async () => {
        const stripe = await stripePromise;
        if (!stripe || !active) return;

        // Check if container element is mounted
        const el = document.getElementById('tip-card-element');
        if (el) {
          el.innerHTML = '';
          const elements = stripe.elements();
          const card = elements.create('card', {
            style: {
              base: {
                fontSize: '14px',
                color: '#1f2937',
                '::placeholder': { color: '#9ca3af' },
              },
            },
          });
          card.mount('#tip-card-element');
          setCardElement(card);
        }
      };
      // Delay mounting slightly to allow DOM to render container
      const timer = setTimeout(initStripe, 100);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      setCardElement(null);
    }
  }, [selectedTip, stripePromise]);

  // Realtime subscriptions.
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

  async function submitReview() {
    setBusy(true);
    try {
      // 1. Submit review
      const tagsString = selectedTags.length > 0 ? ` [Stood out: ${selectedTags.join(', ')}]` : '';
      const fullComment = `${reviewComment}${tagsString}`;

      const reviewRes = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          rating,
          comment: fullComment.trim() || null,
        }),
      });
      if (!reviewRes.ok) throw new Error('Could not submit review');

      // 2. Process Tip Payment via Connect if added
      let tipAmount = 0;
      if (selectedTip === 'other') {
        tipAmount = Math.round(parseFloat(customTip) * 100);
      } else if (selectedTip) {
        tipAmount = Math.round(parseFloat(selectedTip.replace('£', '')) * 100);
      }

      if (tipAmount > 0 && cardElement) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe failed to load');

        const tipRes = await fetch('/api/tips', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            booking_id: booking.id,
            amount_pence: tipAmount,
          }),
        });
        if (!tipRes.ok) {
          const j = await tipRes.json().catch(() => ({}));
          throw new Error(j.error || 'Failed to create tip intent');
        }
        const { clientSecret } = await tipRes.json();

        const { error: payErr } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: booking.customer?.full_name || 'Customer' },
          },
        });
        if (payErr) {
          throw new Error(payErr.message || 'Payment confirmation failed');
        }
      }

      setReviewed(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
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
      alert(e.message);
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
      alert(e.message);
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
        body: JSON.stringify({ scheduled_at: new Date(reschedAt).toISOString() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error === 'invalid_time' ? 'Pick a time in the future.' : 'Could not reschedule',
        );
      }
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl">{booking.category?.name ?? 'Booking'}</h1>
          <p className="font-mono-utility text-muted">#{booking.short_code}</p>
        </div>
        <Badge tone={tone(booking.status)}>{booking.status.replace(/_/g, ' ')}</Badge>
      </header>

      {booking.status === 'unmatched' ? (
        <Card className="space-y-2">
          <div className="flex items-center gap-2 text-danger">
            <AlertOctagon className="h-4 w-4" /> We couldn't find a provider right now.
          </div>
          <p className="text-sm text-muted">
            All eligible providers were busy or unavailable. You can retry matching now or register
            to receive a notification later.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={retryMatching} disabled={busy}>
              {busy ? 'Retrying…' : 'Retry Matching'}
            </Button>
            <Button variant="ghost" size="sm">
              Notify me when available
            </Button>
          </div>
        </Card>
      ) : booking.status === 'on_the_way' || booking.status === 'in_progress' ? (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-2/3">
            <Card className="p-0 overflow-hidden h-64 lg:h-96 relative">
              {providerLoc ? (
                <iframe
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
      ) : (
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
          <p className="text-[10px] text-muted mt-2 text-center px-4">
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
              {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                <Button variant="outline" size="sm">
                  <Phone className="mr-1 h-4 w-4" /> Call
                </Button>
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
            <span className="text-muted">VAT (20%)</span>
            <span>{pence(booking.vat_pence)}</span>
          </li>
          <li className="flex justify-between font-display text-lg">
            <span>Total</span>
            <span>{pence(booking.total_pence)}</span>
          </li>
        </ul>
        <div className="text-xs text-muted">
          Paid by {booking.payment_method === 'card' ? 'card' : 'cash'} ·{' '}
          <span className={payment?.status === 'succeeded' ? 'text-success' : 'text-accent'}>
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
              className="flex items-center gap-1 text-xs font-medium text-accent"
            >
              <Phone className="h-3.5 w-3.5" /> Call
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
                    className={`mt-0.5 self-end text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}
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

      {/* Mobile full-screen review flow */}
      {booking.status === 'completed' && !reviewed && !dismissedReview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg px-4 py-6 overflow-y-auto pb-24 lg:hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <button
              onClick={() => setDismissedReview(true)}
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Skip
            </button>
            <h2 className="font-display text-lg font-bold text-ink">Rate Provider</h2>
            <div className="w-12" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6 py-6">
            <div className="text-center space-y-2">
              <h3 className="font-display text-base font-bold text-ink">
                How was your service with {booking.provider?.full_name ?? 'your provider'}?
              </h3>
              <div className="flex justify-center py-2">
                <RatingInput value={rating} onChange={setRating} />
              </div>
            </div>

            {/* Tags Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">What stood out? (Optional)</label>
              <div className="flex flex-wrap gap-2">
                {['Punctual', 'Friendly', 'Attention to Detail', 'Went Above & Beyond'].map(
                  (tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags((cur) =>
                            isSelected ? cur.filter((t) => t !== tag) : [...cur, tag],
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          isSelected
                            ? 'border-ink bg-ink text-bg'
                            : 'border-hairline bg-white text-ink hover:bg-bg'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <Field label="Leave a comment (Optional)">
              <textarea
                rows={3}
                placeholder="Great service, highly recommend..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
              />
            </Field>

            {/* Tip Section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted">
                Add a tip? (100% goes to the provider)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['£2', '£5', '£10'].map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    onClick={() => {
                      setSelectedTip(tip);
                      setCustomTip('');
                    }}
                    className={`tap rounded-xl border py-2 text-center text-sm font-medium transition ${
                      selectedTip === tip
                        ? 'border-ink bg-ink text-bg'
                        : 'border-hairline bg-white text-ink hover:bg-bg'
                    }`}
                  >
                    {tip}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedTip('other')}
                  className={`tap rounded-xl border py-2 text-center text-sm font-medium transition ${
                    selectedTip === 'other'
                      ? 'border-ink bg-ink text-bg'
                      : 'border-hairline bg-white text-ink hover:bg-bg'
                  }`}
                >
                  Custom
                </button>
              </div>

              {selectedTip === 'other' && (
                <Field label="Custom Tip Amount (£)">
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    className="tap w-full rounded-xl border border-hairline bg-white px-3.5 py-2 text-sm focus:border-ink focus:outline-none"
                  />
                </Field>
              )}

              {/* Stripe Card Input */}
              {selectedTip && (
                <div className="space-y-2 border-t border-hairline pt-3 mt-2">
                  <label className="text-xs font-medium text-muted">Card Payment Details</label>
                  <div
                    id="tip-card-element"
                    className="p-3 border border-hairline rounded-xl bg-white focus-within:border-ink"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Submit Review CTA */}
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
            <Button onClick={submitReview} disabled={rating === 0 || busy} size="block">
              {busy ? 'Submitting…' : 'SUBMIT REVIEW & TIP'}
            </Button>
          </div>
        </div>
      )}

      {/* Desktop review card (Centered focused modal overlay) */}
      {booking.status === 'completed' && !reviewed && !dismissedReview && (
        <div className="fixed inset-0 z-50 hidden lg:flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setDismissedReview(true)}
              className="absolute right-4 top-4 text-xs font-semibold text-muted hover:text-ink cursor-pointer"
            >
              ✕ Skip for now
            </button>

            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-ink">HOW WAS YOUR SERVICE?</h2>
              <p className="text-xs text-muted">
                Standard Clean · #{booking.short_code} · Pro: {booking.provider?.full_name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-ink block">Tap to Rate:</label>
              <RatingInput value={rating} onChange={setRating} />
            </div>

            {/* Tags Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted block">
                What stood out? (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {['Punctual', 'Friendly', 'Attention to Detail', 'Went Above & Beyond'].map(
                  (tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags((cur) =>
                            isSelected ? cur.filter((t) => t !== tag) : [...cur, tag],
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          isSelected
                            ? 'border-ink bg-ink text-bg'
                            : 'border-hairline bg-white text-ink hover:bg-bg'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <Field label="Leave a comment (Optional)">
              <textarea
                rows={3}
                placeholder="Share your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
              />
            </Field>

            {/* Tip Section */}
            <div className="space-y-3 pt-2 border-t border-hairline">
              <label className="text-xs font-bold text-ink block">
                Leave a tip (100% goes to the professional)
              </label>
              <div className="flex gap-2">
                {['£2', '£5', '£10'].map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    onClick={() => {
                      setSelectedTip(tip);
                      setCustomTip('');
                    }}
                    className={`tap rounded-xl border px-4 py-2 text-sm font-medium transition ${
                      selectedTip === tip
                        ? 'border-ink bg-ink text-white'
                        : 'border-hairline bg-white text-ink'
                    }`}
                  >
                    {tip}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedTip('other')}
                  className={`tap rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    selectedTip === 'other'
                      ? 'border-ink bg-ink text-white'
                      : 'border-hairline bg-white text-ink'
                  }`}
                >
                  Custom
                </button>
              </div>

              {selectedTip === 'other' && (
                <input
                  type="number"
                  placeholder="Amount (£)"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  className="tap rounded-xl border border-hairline px-3.5 py-2 text-sm mt-2 focus:border-ink focus:outline-none w-full"
                />
              )}

              {/* Stripe Card Input */}
              {selectedTip && (
                <div className="space-y-2 border-t border-hairline pt-3 mt-2">
                  <label className="text-xs font-medium text-muted">Card Payment Details</label>
                  <div
                    id="tip-card-element"
                    className="p-3 border border-hairline rounded-xl bg-white focus-within:border-ink"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="ghost" onClick={() => setDismissedReview(true)} disabled={busy}>
                SKIP FOR NOW
              </Button>
              <Button onClick={submitReview} disabled={rating === 0 || busy} className="px-6">
                {busy ? 'Submitting…' : 'SUBMIT REVIEW & TIP'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {reviewed && !hasReview && (
        <EmptyState
          title="Thanks for the review"
          description="Your feedback helps us match better in the future."
        />
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
                min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
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

      {/* Cancellation Modal / Bottom Sheet */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-ink">Cancel Booking</h3>
            <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger leading-relaxed">
              <strong>Cancellation Policy:</strong> Free cancellation up to 24 hours before the
              service. Cancellations made within 24 hours will incur a £10.00 fee.
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-ink block">Please select a reason:</span>
              {['Schedule changed', 'Booked by mistake', 'Found another provider'].map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-3 py-2 px-3 border border-hairline rounded-xl cursor-pointer hover:bg-bg/10"
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
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setCancelOpen(false)}>
                NEVERMIND
              </Button>
              <Button variant="danger" className="flex-1" onClick={cancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'CONFIRM CANCEL'}
              </Button>
            </div>
          </div>
        </div>
      )}
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

function tone(s: string) {
  if (s === 'completed') return 'success' as const;
  if (s === 'cancelled' || s === 'unmatched' || s === 'disputed') return 'danger' as const;
  return 'accent' as const;
}
