'use client';

import * as React from 'react';
import { Button } from '@urban-assist/ui';

type Provider = {
  provider_id: string;
  full_name: string | null;
  email: string | null;
  rating: number;
  completed_jobs: number;
  cancellation_rate: number;
  last_seen_at: string | null;
  earnings_pence: number;
  is_available: boolean;
};

export function AssignmentPanel({ bookingId }: { bookingId: string }) {
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function loadProviders() {
    setOpen(true);
    if (providers.length || message) return;
    setLoading(true);
    const response = await fetch(`/api/bookings/${bookingId}/assignment-options`);
    const body = await response.json();
    setProviders(body.providers ?? []);
    if (!response.ok) setMessage(body.error ?? 'Unable to load providers');
    setLoading(false);
  }

  async function assign(providerId: string) {
    setLoading(true);
    const response = await fetch(`/api/bookings/${bookingId}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId }),
    });
    const body = await response.json();
    setMessage(response.ok ? 'Provider assigned' : (body.error ?? 'Assignment failed'));
    setLoading(false);
    if (response.ok) window.location.reload();
  }

  if (!open)
    return (
      <Button onClick={loadProviders} variant="secondary" size="sm">
        Assign provider
      </Button>
    );

  return (
    <div className="flex min-w-64 flex-col gap-2">
      {loading && <span className="text-xs text-muted">Loading…</span>}
      {message && <span className="text-xs text-muted">{message}</span>}
      {!loading &&
        !message &&
        providers.map((provider) => (
          <button
            key={provider.provider_id}
            onClick={() => assign(provider.provider_id)}
            disabled={!provider.is_available}
            className="rounded-lg border border-hairline px-3 py-2 text-left text-xs hover:bg-bg"
          >
            <span className="block font-semibold text-ink">
              {provider.full_name || provider.email || provider.provider_id.slice(0, 8)}
            </span>
            <span className="text-muted">
              {provider.is_available ? 'Available' : 'Unavailable'} ·{' '}
              {Number(provider.rating ?? 0).toFixed(1)} rating · {provider.completed_jobs} jobs
            </span>
          </button>
        ))}
      {!loading && !message && !providers.length && (
        <span className="text-xs text-muted">No eligible providers</span>
      )}
    </div>
  );
}
