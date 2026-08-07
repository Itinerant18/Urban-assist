'use client';

import * as React from 'react';
import { Button, Field, RatingInput } from '@urban-assist/ui';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { StickyActionBar } from './sticky-action-bar';

const TAGS = ['On time', 'Professional', 'Clean work', 'Friendly', 'Went above & beyond'] as const;

type RateBooking = {
  id: string;
  short_code: string;
  category?: { name?: string | null } | null;
  provider?: { id?: string; full_name?: string | null; avatar_url?: string | null } | null;
  provider_service_id?: string | null;
};

export function RatingPrompt({
  booking,
  onDone,
}: {
  booking: RateBooking;
  /** Called after successful submit (before optional navigation). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [selectedTip, setSelectedTip] = React.useState<string | null>(null);
  const [customTip, setCustomTip] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [stripePromise] = React.useState(() =>
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'),
  );
  const [cardElement, setCardElement] = React.useState<any>(null);

  React.useEffect(() => {
    if (!selectedTip || typeof window === 'undefined') {
      setCardElement(null);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      const stripe = await stripePromise;
      if (!stripe || !active) return;
      const el = document.getElementById('rate-tip-card-element');
      if (!el) return;
      el.innerHTML = '';
      const elements = stripe.elements();
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '15px',
            color: '#2B2B28',
            '::placeholder': { color: '#6B6A62' },
          },
        },
      });
      card.mount('#rate-tip-card-element');
      setCardElement(card);
    }, 80);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedTip, stripePromise]);

  async function submitReview() {
    if (rating === 0) {
      setError('Tap a star rating to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tagsString = selectedTags.length > 0 ? ` [Stood out: ${selectedTags.join(', ')}]` : '';
      const fullComment = `${reviewComment}${tagsString}`.trim();

      const reviewRes = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          rating,
          comment: fullComment || null,
        }),
      });
      if (!reviewRes.ok) {
        const payload = await reviewRes.json().catch(() => ({}));
        throw new Error(
          payload.error === 'review_already_submitted'
            ? 'You have already reviewed this booking.'
            : 'Could not submit review',
        );
      }

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
          throw new Error('Review saved, but tip payment failed. You can tip later from the booking.');
        }
        const tipData = await tipRes.json();
        if (tipData.clientSecret) {
          const { error: payErr } = await stripe.confirmCardPayment(tipData.clientSecret, {
            payment_method: { card: cardElement },
          });
          if (payErr) {
            throw new Error(payErr.message ?? 'Tip payment failed');
          }
        }
      }

      setDone(true);
      onDone?.();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
          ✓
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Thanks for the review</h1>
        <p className="text-sm text-muted">
          Your feedback helps Urban Assist match better for you and others.
        </p>
        <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {booking.provider_service_id ? (
            <Button onClick={() => router.push(`/book/${booking.provider_service_id}`)} className="min-h-12">
              Book again
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => router.push(`/bookings/${booking.id}`)} className="min-h-12">
            Back to booking
          </Button>
        </div>
      </div>
    );
  }

  const providerName = booking.provider?.full_name ?? 'your professional';

  return (
    <div className="mx-auto max-w-lg pb-32 lg:pb-10">
      <div className="space-y-6 px-1 py-4 sm:px-0">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-hairline">
            {booking.provider?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={booking.provider.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-lg font-bold text-muted">
                {providerName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">How was your service?</h1>
          <p className="text-sm text-muted">
            {booking.category?.name ?? 'Home service'} with {providerName}
            <span className="block font-mono-utility text-xs mt-1">#{booking.short_code}</span>
          </p>
          <p className="text-xs text-muted">Help us improve Urban Assist for you and others.</p>
        </div>

        <div className="flex justify-center py-2">
          <RatingInput value={rating} onChange={setRating} />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted">What stood out? (optional)</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
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
                  className={`min-h-10 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-hairline bg-white text-ink'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Comment (optional)">
          <textarea
            rows={3}
            placeholder="Share anything that would help the next customer…"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className="w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
          />
        </Field>

        <div className="space-y-3 border-t border-hairline pt-4">
          <label className="text-xs font-semibold text-muted">
            Add a tip? (100% goes to the professional)
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
                className={`tap min-h-12 rounded-xl border text-sm font-semibold transition ${
                  selectedTip === tip
                    ? 'border-accent bg-accent text-white'
                    : 'border-hairline bg-white text-ink'
                }`}
              >
                {tip}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedTip('other')}
              className={`tap min-h-12 rounded-xl border text-sm font-semibold transition ${
                selectedTip === 'other'
                  ? 'border-accent bg-accent text-white'
                  : 'border-hairline bg-white text-ink'
              }`}
            >
              Custom
            </button>
          </div>
          {selectedTip === 'other' && (
            <Field label="Custom tip (£)">
              <input
                type="number"
                min="1"
                placeholder="Amount"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                className="tap w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
              />
            </Field>
          )}
          {selectedTip && (
            <div className="space-y-2 border-t border-hairline pt-3">
              <label className="text-xs font-medium text-muted">Card for tip</label>
              <div
                id="rate-tip-card-element"
                className="rounded-xl border border-hairline bg-white p-3 focus-within:border-ink"
              />
            </div>
          )}
        </div>

        {error && <p className="text-center text-sm font-medium text-danger">{error}</p>}

        <div className="hidden gap-2 lg:flex">
          <Button variant="outline" className="min-h-12 flex-1" onClick={() => router.push(`/bookings/${booking.id}`)}>
            Skip for now
          </Button>
          <Button className="min-h-12 flex-1" onClick={submitReview} disabled={rating === 0 || busy}>
            {busy ? 'Submitting…' : selectedTip ? 'Submit review & tip' : 'Submit review'}
          </Button>
        </div>
      </div>

      <StickyActionBar zClassName="z-50">
        <Button
          variant="outline"
          className="min-h-12 shrink-0 px-3"
          onClick={() => router.push(`/bookings/${booking.id}`)}
          disabled={busy}
        >
          Skip
        </Button>
        <Button className="min-h-12 flex-1" onClick={submitReview} disabled={rating === 0 || busy} size="block">
          {busy ? 'Submitting…' : selectedTip ? 'Submit review & tip' : 'Submit review'}
        </Button>
      </StickyActionBar>
    </div>
  );
}
