'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { AssignmentCandidate } from '../../../../../lib/assignment-engine';
import { Button, Textarea } from '@urban-assist/ui';

interface AssignmentWorkspaceProps {
  booking: {
    id: string;
    shortCode: string;
    currentProviderId: string | null;
    preferredProviderId: string | null;
    preferredProviderName: string | null;
  };
  candidates: AssignmentCandidate[];
}

function formatMoney(pence: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

export function AssignmentWorkspace({ booking, candidates }: AssignmentWorkspaceProps) {
  const router = useRouter();
  const preferredAvailable = candidates.find(
    (c) =>
      c.provider_id === booking.preferredProviderId &&
      c.is_available &&
      c.training_eligible !== false,
  );
  const [selectedProvider, setSelectedProvider] = React.useState(
    preferredAvailable?.provider_id ?? '',
  );
  const [reason, setReason] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isReassignment = Boolean(booking.currentProviderId);
  const isOverride =
    Boolean(booking.preferredProviderId) &&
    Boolean(selectedProvider) &&
    selectedProvider !== booking.preferredProviderId;
  const reasonRequired = isReassignment || isOverride;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProvider) return;
    if (reasonRequired && reason.trim().length < 3) {
      setError(
        isOverride
          ? 'Add a short reason when overriding the customer preference.'
          : 'Add a reassignment reason for the audit trail.',
      );
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch('/api/bookings/' + booking.id + '/assign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider_id: selectedProvider,
        reason: reason.trim() || undefined,
        strategy: 'manual_admin',
        generate_otp: true,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Assignment failed.');
      setPending(false);
      return;
    }

    router.push('/bookings/' + booking.id);
    router.refresh();
  }

  const sorted = React.useMemo(() => {
    return [...candidates].sort((a, b) => {
      const train = Number(b.training_eligible !== false) - Number(a.training_eligible !== false);
      if (train) return train;
      return Number(b.is_preferred) - Number(a.is_preferred);
    });
  }, [candidates]);

  return (
    <form onSubmit={submit} className="space-y-5">
      {booking.preferredProviderId ? (
        <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-ink">
          Customer prefers{' '}
          <strong>{booking.preferredProviderName ?? 'a previous professional'}</strong>
          {preferredAvailable
            ? ' — pre-selected below when available.'
            : ' — not currently eligible; pick another provider and note why.'}
        </div>
      ) : null}

      {reasonRequired && (
        <label className="card block text-sm text-ink">
          <span className="font-semibold">
            {isOverride ? 'Why override the preferred professional?' : 'Why is this booking being reassigned?'}
          </span>
          <Textarea
            className="mt-3 min-h-24"
            maxLength={500}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              isOverride
                ? 'Preferred pro unavailable, distance, schedule conflict, etc.'
                : 'Provider rejected, cancelled, no-showed, or another operational reason'
            }
          />
        </label>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Eligible providers</h2>
            <p className="mt-1 text-xs text-muted">
              Category, postcode, vetting, schedule, training, and active-job checks are enforced
              server-side.
            </p>
          </div>
          <span className="font-mono-utility text-xs text-muted">{sorted.length} matches</span>
        </div>

        {!sorted.length ? (
          <div className="card py-10 text-center text-sm text-muted">
            No provider currently satisfies all eligibility rules.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline bg-white">
            {sorted.map((provider) => {
              const selected = selectedProvider === provider.provider_id;
              const trainingOk = provider.training_eligible !== false;
              const selectable = provider.is_available && trainingOk;
              return (
                <label
                  key={provider.provider_id}
                  className={
                    'grid cursor-pointer gap-3 border-b border-hairline p-4 last:border-b-0 md:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(5rem,1fr))] ' +
                    (selected ? 'bg-bg' : 'hover:bg-bg/60') +
                    (selectable ? '' : ' opacity-60')
                  }
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <input
                      type="radio"
                      name="provider"
                      value={provider.provider_id}
                      checked={selected}
                      disabled={!selectable}
                      onChange={() => setSelectedProvider(provider.provider_id)}
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {provider.full_name ?? provider.email ?? provider.provider_id.slice(0, 8)}
                        </span>
                        {provider.is_preferred ? (
                          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                            Preferred
                          </span>
                        ) : null}
                        {!trainingOk ? (
                          <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-danger">
                            Training incomplete
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {provider.email}
                        {!provider.is_available ? ' · unavailable now' : ''}
                        {!trainingOk ? ' · complete gated training first' : ''}
                      </span>
                    </span>
                  </span>
                  <Metric label="Rating" value={Number(provider.rating).toFixed(1)} />
                  <Metric label="Completed" value={String(provider.completed_jobs)} />
                  <Metric label="Cancellation" value={Number(provider.cancellation_rate).toFixed(1) + '%'} />
                  <Metric label="Earnings" value={formatMoney(provider.earnings_pence)} />
                  <Metric
                    label="Last seen"
                    value={
                      provider.last_seen_at
                        ? new Date(provider.last_seen_at).toLocaleDateString()
                        : 'Unknown'
                    }
                  />
                </label>
              );
            })}
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={!selectedProvider || pending}>
          {pending
            ? 'Assigning…'
            : isOverride
              ? 'Override preference & assign'
              : isReassignment
                ? 'Confirm reassignment'
                : preferredAvailable && selectedProvider === preferredAvailable.provider_id
                  ? 'Assign preferred provider'
                  : 'Assign provider'}
        </Button>
      </div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="block text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className="mt-1 block text-xs font-medium text-ink">{value}</span>
    </span>
  );
}
