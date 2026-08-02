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
  is_preferred?: boolean;
  training_eligible?: boolean;
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
    const list = (body.providers ?? []) as Provider[];
    list.sort(
      (a, b) =>
        Number(b.training_eligible !== false) - Number(a.training_eligible !== false) ||
        Number(b.is_preferred) - Number(a.is_preferred),
    );
    setProviders(list);
    if (!response.ok) setMessage(body.error ?? 'Unable to load providers');
    setLoading(false);
  }

  async function assign(providerId: string) {
    const target = providers.find((p) => p.provider_id === providerId);
    const isOverride = Boolean(
      providers.some((p) => p.is_preferred) && target && !target.is_preferred,
    );
    let reason: string | undefined;
    if (isOverride) {
      const entered = window.prompt(
        'Customer preferred another pro. Short reason for override (required):',
      );
      if (!entered || entered.trim().length < 3) {
        setMessage('Override reason required (min 3 characters).');
        return;
      }
      reason = entered.trim();
    }

    setLoading(true);
    const response = await fetch(`/api/bookings/${bookingId}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, reason }),
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
          <Button
            key={provider.provider_id}
            variant="outline"
            size="sm"
            onClick={() => assign(provider.provider_id)}
            disabled={!provider.is_available || provider.training_eligible === false}
            className="h-auto flex-col items-start text-left"
          >
            <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
              {provider.full_name || provider.email || provider.provider_id.slice(0, 8)}
              {provider.is_preferred ? (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                  Preferred
                </span>
              ) : null}
              {provider.training_eligible === false ? (
                <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-danger">
                  Training
                </span>
              ) : null}
            </span>
            <span className="text-muted">
              {provider.training_eligible === false
                ? 'Training incomplete'
                : provider.is_available
                  ? 'Available'
                  : 'Unavailable'}{' '}
              · {Number(provider.rating ?? 0).toFixed(1)} rating · {provider.completed_jobs} jobs
            </span>
          </Button>
        ))}
      {!loading && !message && !providers.length && (
        <span className="text-xs text-muted">No eligible providers</span>
      )}
    </div>
  );
}
