'use client';
// Customer-side booking detail + live tracking.
// Subscribes to Supabase Realtime for status / message updates.

import * as React from 'react';
import { Card, Badge, Button, LiveStatusTrack, statusToStage, RatingInput, EmptyState, Field, Textarea } from '@urban-assist/ui';
import { pence, ukDateTime, getBookingOtp } from '@urban-assist/lib';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Banknote, Phone, MessageSquare, AlertOctagon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BookingDetail({ booking: initialBooking, payment: initialPayment, hasReview = false }: { booking: any; payment: any; hasReview?: boolean }) {
  const router = useRouter();
  const [booking, setBooking] = React.useState(initialBooking);
  const [payment, setPayment] = React.useState(initialPayment);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState('');
  const [rating, setRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewed, setReviewed] = React.useState(hasReview);
  const [busy, setBusy] = React.useState(false);

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
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${booking.id}` },
        (p) => setMessages((m) => [...m, p.new]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `booking_id=eq.${booking.id}` },
        (p) => setPayment((cur: any) => ({ ...cur, ...p.new })),
      )
      .subscribe();
    // Backfill messages.
    sb.from('messages').select('*').eq('booking_id', booking.id).order('created_at').then(({ data }) => {
      setMessages(data ?? []);
    });
    return () => {
      sb.removeChannel(ch);
    };
  }, [booking.id]);

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
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id, rating, comment: reviewComment || null }),
    });
    setReviewed(true);
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

  async function cancel() {
    if (!window.confirm('Cancel this booking? Card payments are refunded in full.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error === 'not_cancellable' ? 'Too late to cancel — the provider is already on the way. Contact support.' : 'Could not cancel');
      }
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  const cancellable = ['pending_match', 'unmatched', 'assigned'].includes(booking.status);

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
            All eligible providers were busy or unavailable. You can retry matching now or register to receive a notification later.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={retryMatching} disabled={busy}>
              {busy ? 'Retrying…' : 'Retry Matching'}
            </Button>
            <Button variant="ghost" size="sm">Notify me when available</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <LiveStatusTrack stage={stage} />
        </Card>
      )}

      {['assigned', 'on_the_way', 'arrived'].includes(booking.status) && (
        <Card className="bg-accent/5 border-accent/20 flex flex-col items-center justify-center py-5">
          <span className="font-mono-utility text-xs text-muted">Start Verification Code</span>
          <span className="font-display text-3xl font-bold tracking-widest mt-1 text-ink">{getBookingOtp(booking.id)}</span>
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
                <img src={booking.provider.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1">
              <div className="font-medium">{booking.provider.full_name}</div>
              <div className="text-xs text-muted">★ {Number(booking.provider.rating_avg ?? 0).toFixed(1)}</div>
            </div>
            <div className="flex gap-2">
              {booking.status === 'completed' && booking.provider_service_id && (
                <Button size="sm" onClick={() => router.push(`/book/${booking.provider_service_id}`)}>
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
        <p className="text-sm">{ukDateTime(booking.scheduled_at)}</p>
        <p className="text-sm text-muted">
          {[booking.address?.line1, booking.address?.line2, booking.address?.city, booking.address?.postcode]
            .filter(Boolean)
            .join(', ')}
        </p>
      </Card>

      <Card className="space-y-2">
        <div className="text-xs font-mono-utility text-muted">Receipt</div>
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between"><span className="text-muted">Service</span><span>{pence(booking.price_pence)}</span></li>
          <li className="flex justify-between"><span className="text-muted">VAT (20%)</span><span>{pence(booking.vat_pence)}</span></li>
          <li className="flex justify-between font-display text-lg"><span>Total</span><span>{pence(booking.total_pence)}</span></li>
        </ul>
        <div className="text-xs text-muted">
          Paid by {booking.payment_method === 'card' ? 'card' : 'cash'} ·{' '}
          <span className={payment?.status === 'succeeded' ? 'text-success' : 'text-accent'}>
            {payment?.status ?? 'pending'}
          </span>
        </div>
        {booking.payment_method === 'cash' && booking.status === 'completed' && payment?.status !== 'succeeded' && (
          <Button onClick={confirmCash}><Banknote className="mr-2 h-4 w-4" />I paid in cash</Button>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="text-xs font-mono-utility text-muted">Chat</div>
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {messages.length === 0 && <li className="text-muted">No messages yet — say hi when you're matched.</li>}
          {messages.map((m) => (
            <li key={m.id} className="rounded-lg bg-bg px-3 py-2">{m.content}</li>
          ))}
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

      {booking.status === 'completed' && !reviewed && (
        <Card className="space-y-2">
          <div className="text-xs font-mono-utility text-muted">Rate your provider</div>
          <RatingInput value={rating} onChange={setRating} />
          <Field label="Comment (optional)">
            <Textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
          </Field>
          <Button onClick={submitReview} disabled={rating === 0}>Submit review</Button>
        </Card>
      )}
      {reviewed && !hasReview && (
        <EmptyState title="Thanks for the review" description="Your feedback helps us match better in the future." />
      )}

      {cancellable && (
        <Button variant="outline" className="w-full text-danger border-danger/40 hover:border-danger" onClick={cancel} disabled={busy}>
          {busy ? 'Cancelling…' : 'Cancel booking'}
        </Button>
      )}
    </div>
  );
}

function tone(s: string) {
  if (s === 'completed') return 'success' as const;
  if (s === 'cancelled' || s === 'unmatched' || s === 'disputed') return 'danger' as const;
  return 'accent' as const;
}
