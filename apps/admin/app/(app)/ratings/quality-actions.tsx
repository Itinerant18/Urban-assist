'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@urban-assist/ui';

type Props = {
  reviewId: string;
  providerId: string;
  bookingId: string;
  categoryId: string | null;
};

export function QualityActions({ reviewId, providerId, bookingId, categoryId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  async function run(action: 'warn' | 'open_ticket' | 'restrict_category') {
    setBusy(action);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/ratings/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, reviewId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Action failed');
      if (action === 'open_ticket' && payload.ticketId) {
        setDone('Ticket opened');
        router.push(`/tickets/${payload.ticketId}`);
        return;
      }
      setDone(
        action === 'warn'
          ? 'Warning logged'
          : action === 'restrict_category'
            ? 'Category restricted'
            : 'Done',
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void run('warn')}
        >
          {busy === 'warn' ? 'Warning…' : 'Warn provider'}
        </Button>
        <Link
          href={`/providers/${providerId}/training`}
          className="inline-flex items-center rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-bg"
        >
          Training
        </Link>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void run('open_ticket')}
        >
          {busy === 'open_ticket' ? 'Opening…' : 'Open ticket'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={busy !== null || !categoryId}
          title={!categoryId ? 'No category on booking' : undefined}
          onClick={() => {
            if (
              !window.confirm(
                'Deactivate this provider’s services in the booking category? They will stop receiving new jobs in that category.',
              )
            ) {
              return;
            }
            void run('restrict_category');
          }}
        >
          {busy === 'restrict_category' ? 'Restricting…' : 'Restrict category'}
        </Button>
        <Link
          href={`/bookings/${bookingId}`}
          className="inline-flex items-center rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-bg hover:text-ink"
        >
          Booking
        </Link>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {done ? <p className="text-xs font-medium text-success">{done}</p> : null}
    </div>
  );
}
