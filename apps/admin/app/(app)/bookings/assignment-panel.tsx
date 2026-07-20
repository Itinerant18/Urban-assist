'use client';

import * as React from 'react';
import { Button } from '@urban-assist/ui';

type Provider = {
  id: string;
  full_name: string | null;
  email: string | null;
  rating_avg: number;
  is_online: boolean;
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
            key={provider.id}
            onClick={() => assign(provider.id)}
            className="rounded-lg border border-hairline px-3 py-2 text-left text-xs hover:bg-bg"
          >
            <span className="block font-semibold text-ink">
              {provider.full_name || provider.email || provider.id.slice(0, 8)}
            </span>
            <span className="text-muted">
              {provider.is_online ? 'Online' : 'Offline'} ·{' '}
              {Number(provider.rating_avg ?? 0).toFixed(1)} rating
            </span>
          </button>
        ))}
      {!loading && !message && !providers.length && (
        <span className="text-xs text-muted">No eligible providers</span>
      )}
    </div>
  );
}
