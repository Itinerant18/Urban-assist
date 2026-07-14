'use client';

import * as React from 'react';
import { Button } from '@urban-assist/ui';
import { RefreshCw, Wallet, PiggyBank, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ProviderBalance = {
  providerId: string;
  fullName: string;
  stripeAccountId: string | null;
  balancePence: number;
};

type FinancialsProps = {
  pendingPayoutsTotal: number;
  platformRevenueTotal: number;
  failedPayoutsTotal: number;
  balances: ProviderBalance[];
};

export function FinancialsClient({
  pendingPayoutsTotal,
  platformRevenueTotal,
  failedPayoutsTotal,
  balances,
}: FinancialsProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [batchLoading, setBatchLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedProvider, setExpandedProvider] = React.useState<string | null>(null);

  async function handlePay(providerId: string) {
    setLoadingId(providerId);
    setMsg(null);
    try {
      const res = await fetch('/api/financials/payout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Payout failed');

      setMsg({ text: `Successfully processed payout of £${(data.amount_pence / 100).toFixed(2)}`, type: 'success' });
      router.refresh();
    } catch (e: any) {
      setMsg({ text: e.message ?? 'Failed to process payout', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  }

  async function handleBatchPay() {
    setBatchLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/financials/payout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ batch: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Batch payout failed');

      setMsg({
        text: `Successfully processed batch payouts for ${data.processed?.length ?? 0} providers`,
        type: 'success',
      });
      router.refresh();
    } catch (e: any) {
      setMsg({ text: e.message ?? 'Failed to process batch payouts', type: 'error' });
    } finally {
      setBatchLoading(false);
    }
  }

  const formattedPending = (pendingPayoutsTotal / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  });
  const formattedRevenue = (platformRevenueTotal / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  });
  const formattedFailed = (failedPayoutsTotal / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Financial Ledger & Payouts</h1>
          <p className="text-sm text-muted mt-1">Manage escrow funds and dispatch Stripe Connect provider payouts.</p>
        </div>
        <Button
          onClick={() => {
            router.refresh();
            setMsg({ text: 'Sync completed', type: 'success' });
          }}
          variant="outline"
          className="flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="h-4 w-4" /> Sync
        </Button>
      </div>

      {/* Message Banner */}
      {msg && (
        <div
          className={`flex items-start gap-2.5 p-4 rounded-xl border text-sm font-medium transition-all ${
            msg.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border border-hairline bg-white rounded-2xl shadow-sm flex items-start gap-4">
          <div className="rounded-xl bg-accent/10 p-3 text-accent shrink-0">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted font-mono-utility">Pending Payouts</p>
            <h3 className="text-2xl font-bold text-ink mt-1">{formattedPending}</h3>
          </div>
        </div>

        <div className="card p-5 border border-hairline bg-white rounded-2xl shadow-sm flex items-start gap-4">
          <div className="rounded-xl bg-green-100 p-3 text-green-700 shrink-0">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted font-mono-utility">Platform Revenue</p>
            <h3 className="text-2xl font-bold text-ink mt-1">{formattedRevenue}</h3>
          </div>
        </div>

        <div className="card p-5 border border-hairline bg-white rounded-2xl shadow-sm flex items-start gap-4">
          <div className="rounded-xl bg-red-100 p-3 text-red-700 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted font-mono-utility">Failed Auth</p>
            <h3 className="text-2xl font-bold text-ink mt-1 text-red-600">{formattedFailed}</h3>
          </div>
        </div>
      </div>

      {/* Provider Balances Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Provider Balances (Ready for Dispatch)</h2>
          {balances.length > 0 && (
            <span className="text-xs font-semibold bg-accent/15 px-2 py-0.5 rounded-full text-accent">
              {balances.length} pending dispatch
            </span>
          )}
        </div>

        {balances.length === 0 ? (
          <div className="card flex flex-col items-center py-12 gap-3 bg-white border border-hairline rounded-2xl">
            <Wallet className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">All provider payouts are fully processed!</p>
          </div>
        ) : (
          <>
            {/* Desktop Ledger Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline bg-bg/40 text-xs font-bold text-muted font-mono-utility">
                    <th className="px-6 py-4">Provider</th>
                    <th className="px-6 py-4">Stripe Acct</th>
                    <th className="px-6 py-4">Balance</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-sm">
                  {balances.map((b) => (
                    <tr key={b.providerId} className="hover:bg-bg/10 transition">
                      <td className="px-6 py-4 font-semibold text-ink">{b.fullName}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted">
                        {b.stripeAccountId ?? <span className="text-red-500 font-sans font-medium">Missing Connect Acct</span>}
                      </td>
                      <td className="px-6 py-4 font-bold text-ink">
                        {(b.balancePence / 100).toLocaleString('en-GB', {
                          style: 'currency',
                          currency: 'GBP',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          onClick={() => handlePay(b.providerId)}
                          disabled={loadingId !== null || batchLoading || !b.stripeAccountId}
                          size="sm"
                        >
                          {loadingId === b.providerId ? 'Paying…' : 'PAY'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Ledger List View */}
            <div className="md:hidden space-y-3">
              {balances.map((b) => {
                const isExpanded = expandedProvider === b.providerId;
                return (
                  <div
                    key={b.providerId}
                    className="card p-4 border border-hairline bg-white rounded-xl shadow-sm space-y-3"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedProvider(isExpanded ? null : b.providerId)}
                    >
                      <div>
                        <h4 className="font-bold text-ink text-sm">{b.fullName}</h4>
                        <p className="text-xs text-muted mt-0.5">
                          {(b.balancePence / 100).toLocaleString('en-GB', {
                            style: 'currency',
                            currency: 'GBP',
                          })}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-hairline space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">Stripe Account:</span>
                          <span className="font-mono font-medium text-ink">
                            {b.stripeAccountId ?? <span className="text-red-500 font-sans">Missing Connect</span>}
                          </span>
                        </div>
                        <Button
                          onClick={() => handlePay(b.providerId)}
                          disabled={loadingId !== null || batchLoading || !b.stripeAccountId}
                          size="block"
                        >
                          {loadingId === b.providerId ? 'Paying…' : 'DISPATCH'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sticky Bottom Batch Action */}
            <div className="fixed inset-x-0 bottom-0 bg-white border-t border-hairline p-4 md:static md:border-0 md:bg-transparent md:p-0 z-10 flex justify-end">
              <Button
                onClick={handleBatchPay}
                disabled={loadingId !== null || batchLoading}
                className="w-full md:w-auto shadow-md"
              >
                {batchLoading ? 'Processing Batch…' : `BATCH PAY ALL PENDING (${formattedPending})`}
              </Button>
            </div>
            {/* Mobile bottom spacing helper */}
            <div className="h-16 md:hidden" />
          </>
        )}
      </div>
    </div>
  );
}
