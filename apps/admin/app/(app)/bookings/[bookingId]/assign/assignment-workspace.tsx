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
  const [selectedProvider, setSelectedProvider] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isReassignment = Boolean(booking.currentProviderId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProvider) return;
    if (isReassignment && reason.trim().length < 3) {
      setError('Add a reassignment reason for the audit trail.');
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

  return (
    <form onSubmit={submit} className="space-y-5">
      {isReassignment && (
        <label className="card block text-sm text-ink">
          <span className="font-semibold">Why is this booking being reassigned?</span>
          <Textarea
            className="mt-3 min-h-24"
            maxLength={500}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Provider rejected, cancelled, no-showed, or another operational reason"
          />
        </label>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Eligible providers</h2>
            <p className="mt-1 text-xs text-muted">Category, postcode, vetting, schedule, and active-job checks are enforced server-side.</p>
          </div>
          <span className="font-mono-utility text-xs text-muted">{candidates.length} matches</span>
        </div>

        {!candidates.length ? (
          <div className="card py-10 text-center text-sm text-muted">
            No provider currently satisfies all eligibility rules.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline bg-white">
            {candidates.map((provider) => {
              const selected = selectedProvider === provider.provider_id;
              return (
                <label
                  key={provider.provider_id}
                  className={
                    'grid cursor-pointer gap-3 border-b border-hairline p-4 last:border-b-0 md:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(5rem,1fr))] ' +
                    (selected ? 'bg-bg' : 'hover:bg-bg/60')
                  }
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <input
                      type="radio"
                      name="provider"
                      value={provider.provider_id}
                      checked={selected}
                      onChange={() => setSelectedProvider(provider.provider_id)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {provider.full_name ?? provider.email ?? provider.provider_id.slice(0, 8)}
                      </span>
                      <span className="block truncate text-xs text-muted">{provider.email}</span>
                    </span>
                  </span>
                  <Metric label="Rating" value={Number(provider.rating).toFixed(1)} />
                  <Metric label="Completed" value={String(provider.completed_jobs)} />
                  <Metric label="Cancellation" value={Number(provider.cancellation_rate).toFixed(1) + '%'} />
                  <Metric label="Earnings" value={formatMoney(provider.earnings_pence)} />
                  <Metric
                    label="Last seen"
                    value={provider.last_seen_at ? new Date(provider.last_seen_at).toLocaleDateString() : 'Unknown'}
                  />
                </label>
              );
            })}
          </div>
        )}
      </section>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!selectedProvider || pending}>
          {pending ? 'Assigning…' : isReassignment ? 'Confirm reassignment' : 'Assign provider'}
        </Button>
      </div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="block text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <span className="mt-1 block text-xs font-medium text-ink">{value}</span>
    </span>
  );
}

