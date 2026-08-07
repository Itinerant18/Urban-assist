'use client';

import * as React from 'react';
import type {
  AdminFinancialDashboard,
  ProviderPayoutReleaseResult,
  ProviderPayoutSummary,
} from '@urban-assist/types';
import { pence as formatPence } from '@urban-assist/lib';
import { Button } from '@urban-assist/ui';
import { StatusChip, type StatusTone } from '@/components/bento';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Landmark,
  Link2,
  RefreshCw,
  ReceiptText,
  ShieldAlert,
  WalletCards,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FinancialsProps {
  dashboard: AdminFinancialDashboard;
}

interface BatchReleaseResponse {
  processed: Array<ProviderPayoutReleaseResult & { provider_id: string; error?: string }>;
}

function releaseSummary(result: ProviderPayoutReleaseResult) {
  const parts = [
    `${result.released} released`,
    `${result.processing} processing`,
    `${result.alreadyPaid} already paid`,
  ];
  if (result.failed > 0) parts.push(`${result.failed} failed`);
  return parts.join(', ');
}

function StatusBadge({ provider }: { provider: ProviderPayoutSummary }) {
  const status = provider.release_status;
  const map: Record<typeof status, { label: string; tone: StatusTone }> = {
    ready: { label: 'Ready', tone: 'accent' },
    processing: { label: 'Processing', tone: 'pending' },
    failed: { label: 'Retry needed', tone: 'danger' },
    paid: { label: 'Paid', tone: 'success' },
    held: { label: 'On hold', tone: 'pending' },
  };
  const { label, tone } = map[status];
  return <StatusChip tone={tone}>{label}</StatusChip>;
}

export function FinancialsClient({ dashboard }: FinancialsProps) {
  const router = useRouter();
  const { metrics, providers } = dashboard;
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [connectLoadingId, setConnectLoadingId] = React.useState<string | null>(null);
  const [batchLoading, setBatchLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const releasableProviders = providers.filter(
    (provider) => provider.releasable_pence > 0 && provider.stripe_account_id,
  );
  const blockedProviders = providers.filter(
    (provider) => provider.releasable_pence > 0 && !provider.stripe_account_id,
  );
  const blockedPence = blockedProviders.reduce((sum, p) => sum + p.releasable_pence, 0);

  async function handlePay(providerId: string) {
    setLoadingId(providerId);
    setMessage(null);
    try {
      const response = await fetch('/api/financials/payout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = (await response.json()) as ProviderPayoutReleaseResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Payout release failed');

      const type = data.failed > 0 ? 'error' : 'success';
      setMessage({ text: `Release complete: ${releaseSummary(data)}.`, type });
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Payout release failed',
        type: 'error',
      });
    } finally {
      setLoadingId(null);
    }
  }

  async function handleBatchPay() {
    setBatchLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/financials/payout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ batch: true }),
      });
      const data = (await response.json()) as BatchReleaseResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Batch payout release failed');

      const total = (data.processed ?? []).reduce<ProviderPayoutReleaseResult>(
        (summary, provider) => ({
          released: summary.released + provider.released,
          processing: summary.processing + provider.processing,
          alreadyPaid: summary.alreadyPaid + provider.alreadyPaid,
          failed: summary.failed + provider.failed,
        }),
        { released: 0, processing: 0, alreadyPaid: 0, failed: 0 },
      );
      const connectErrors = (data.processed ?? []).filter((p) => p.error).length;
      const type = total.failed > 0 || connectErrors > 0 ? 'error' : 'success';
      setMessage({
        text: `Batch checked ${data.processed?.length ?? 0} providers: ${releaseSummary(total)}${
          connectErrors > 0 ? ` (${connectErrors} Connect blocked)` : ''
        }.`,
        type,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Batch payout release failed',
        type: 'error',
      });
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleConnectLink(providerId: string) {
    setConnectLoadingId(providerId);
    setMessage(null);
    try {
      const response = await fetch('/api/financials/connect-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Could not create Connect link');
      window.open(data.url, '_blank', 'noopener,noreferrer');
      setMessage({
        text: 'Stripe Connect onboarding opened in a new tab. Send this to the provider if needed.',
        type: 'success',
      });
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Connect link failed',
        type: 'error',
      });
    } finally {
      setConnectLoadingId(null);
    }
  }

  const metricCards = [
    {
      label: 'Gross processed',
      value: metrics.gross_processed_pence,
      detail: 'Latest successful payment per booking',
      icon: CircleDollarSign,
      iconClass: 'bg-accent/10 text-accent',
    },
    {
      label: 'Provider payable',
      value: metrics.provider_payable_pence,
      detail: 'Completed and settled service value',
      icon: WalletCards,
      iconClass: 'bg-success/12 text-success',
    },
    {
      label: 'Platform fee revenue',
      value: metrics.platform_revenue_pence,
      detail: 'Captured less provider net and VAT',
      icon: Landmark,
      iconClass: 'bg-ink/8 text-ink',
    },
    {
      label: 'VAT collected',
      value: metrics.vat_collected_pence,
      detail: 'Tax recorded on successful payments',
      icon: ReceiptText,
      iconClass: 'bg-amber/15 text-amber',
    },
  ];

  const payoutStates = [
    { label: 'Pending / ready', value: metrics.pending_pence, icon: WalletCards, className: 'text-accent' },
    { label: 'Processing', value: metrics.processing_pence, icon: Clock3, className: 'text-amber' },
    { label: 'Paid', value: metrics.paid_pence, icon: CheckCircle2, className: 'text-success' },
    { label: 'Failed', value: metrics.failed_pence, icon: ShieldAlert, className: 'text-danger' },
    // Held money is deliberately excluded from ready/releasable, so it needs its own tile
    // — otherwise a partial refund or dispute just makes the releasable total shrink with
    // no visible reason.
    { label: 'Held (refund/dispute)', value: metrics.held_pence, icon: ShieldAlert, className: 'text-amber' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Financial ledger & payouts</h1>
          <p className="mt-1 text-sm text-muted">
            Reconcile captured funds and release completed jobs through Stripe Connect.
          </p>
        </div>
        <Button
          onClick={() => router.refresh()}
          variant="outline"
          className="flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh ledger
        </Button>
      </div>

      {message && (
        <div
          aria-live="polite"
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {blockedProviders.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-ink">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-amber" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {blockedProviders.length} provider{blockedProviders.length === 1 ? '' : 's'} blocked
              without Connect ({formatPence(blockedPence)} held)
            </p>
            <p className="mt-1 text-xs text-muted">
              Open a Stripe onboarding link from the row action so they can finish Express setup before
              release.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, detail, icon: Icon, iconClass }) => (
          <div key={label} className="card flex min-w-0 items-start gap-4 p-5 shadow-card">
            <div className={`shrink-0 rounded-lg p-2.5 ${iconClass}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">{label}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-ink">{formatPence(value)}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-4">
        {payoutStates.map(({ label, value, icon: Icon, className }) => (
          <div key={label} className="flex min-w-0 items-center gap-3 bg-white px-4 py-3">
            <Icon className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted">{label}</p>
              <p className="truncate font-mono text-base font-bold text-ink">{formatPence(value)}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Provider release ledger</h2>
            <p className="mt-1 text-xs text-muted">
              {providers.length} provider{providers.length === 1 ? '' : 's'} with completed, settled work.
            </p>
          </div>
          <Button
            onClick={handleBatchPay}
            disabled={loadingId !== null || batchLoading || releasableProviders.length === 0}
            className="w-full sm:w-auto"
          >
            {batchLoading
              ? 'Processing releases...'
              : `Release all ready (${formatPence(metrics.releasable_pence - blockedPence)})`}
          </Button>
        </div>

        {providers.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 border border-hairline bg-white py-12">
            <WalletCards className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">No completed, settled provider jobs yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-hairline bg-white shadow-card md:block">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-hairline bg-bg/40 font-mono-utility text-xs font-bold text-muted">
                    <th className="px-5 py-3">Provider</th>
                    <th className="px-5 py-3">Connect account</th>
                    <th className="px-5 py-3 text-right">Releasable</th>
                    <th className="px-5 py-3 text-right">Processing</th>
                    <th className="px-5 py-3 text-right">Paid</th>
                    <th className="px-5 py-3">State</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-sm">
                  {providers.map((provider) => (
                    <tr key={provider.provider_id} className="hover:bg-bg/10">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink">{provider.full_name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {provider.eligible_booking_count} settled job
                          {provider.eligible_booking_count === 1 ? '' : 's'}
                        </p>
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-3 font-mono text-xs text-muted">
                        {provider.stripe_account_id ?? (
                          <span className="font-sans font-medium text-danger">Not connected</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-ink">
                        {formatPence(provider.releasable_pence)}
                        {provider.failed_pence > 0 && (
                          <p className="mt-0.5 text-xs font-medium text-danger">
                            {formatPence(provider.failed_pence)} retryable
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-ink">{formatPence(provider.processing_pence)}</td>
                      <td className="px-5 py-3 text-right font-mono text-ink">{formatPence(provider.paid_pence)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge provider={provider} />
                        {provider.last_failure_reason && (
                          <p className="mt-1 max-w-48 truncate text-xs text-danger" title={provider.last_failure_reason}>
                            {provider.last_failure_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {!provider.stripe_account_id ? (
                            <Button
                              onClick={() => handleConnectLink(provider.provider_id)}
                              disabled={connectLoadingId !== null || batchLoading}
                              size="sm"
                              variant="outline"
                            >
                              {connectLoadingId === provider.provider_id ? 'Opening...' : 'Open Connect'}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handlePay(provider.provider_id)}
                              disabled={
                                loadingId !== null ||
                                batchLoading ||
                                provider.releasable_pence === 0
                              }
                              size="sm"
                            >
                              {loadingId === provider.provider_id
                                ? 'Releasing...'
                                : provider.failed_pence > 0
                                  ? 'Retry release'
                                  : 'Release'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {providers.map((provider) => (
                <div key={provider.provider_id} className="card space-y-4 border border-hairline bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-ink">{provider.full_name}</h3>
                      <p className="mt-0.5 text-xs text-muted">
                        {provider.eligible_booking_count} settled job
                        {provider.eligible_booking_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <StatusBadge provider={provider} />
                  </div>

                  <dl className="grid grid-cols-3 gap-3 border-y border-hairline py-3">
                    <div>
                      <dt className="text-xs text-muted">Releasable</dt>
                      <dd className="mt-1 font-mono text-sm font-bold text-ink">{formatPence(provider.releasable_pence)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Processing</dt>
                      <dd className="mt-1 font-mono text-sm font-bold text-ink">{formatPence(provider.processing_pence)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Paid</dt>
                      <dd className="mt-1 font-mono text-sm font-bold text-ink">{formatPence(provider.paid_pence)}</dd>
                    </div>
                  </dl>

                  {!provider.stripe_account_id && (
                    <p className="text-xs font-medium text-danger">Stripe Connect account required before release.</p>
                  )}
                  {provider.last_failure_reason && (
                    <p className="text-xs text-danger">Last failure: {provider.last_failure_reason}</p>
                  )}
                  {!provider.stripe_account_id ? (
                    <Button
                      onClick={() => handleConnectLink(provider.provider_id)}
                      disabled={connectLoadingId !== null || batchLoading}
                      size="block"
                      variant="outline"
                    >
                      {connectLoadingId === provider.provider_id
                        ? 'Opening Connect...'
                        : 'Open Stripe Connect onboarding'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePay(provider.provider_id)}
                      disabled={
                        loadingId !== null ||
                        batchLoading ||
                        provider.releasable_pence === 0
                      }
                      size="block"
                    >
                      {loadingId === provider.provider_id
                        ? 'Releasing...'
                        : provider.failed_pence > 0
                          ? 'Retry provider funds'
                          : 'Release provider funds'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
