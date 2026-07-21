import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

import { requireAdminPermission } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

async function grantCredit(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_payments');
  const customerId = String(formData.get('customer_id'));
  const pounds = Number(formData.get('amount'));
  const reason = String(formData.get('reason') ?? '').trim() || 'admin_goodwill';
  if (!customerId || !Number.isFinite(pounds) || pounds <= 0) return;
  const amount_pence = Math.round(pounds * 100);

  await (db as any).from('wallet_ledger').insert({
    profile_id: customerId,
    amount_pence,
    reason: 'admin_goodwill',
  });
  await (db as any).rpc('append_admin_action_log', {
    p_actor_user_id: user.id,
    p_actor_role_code: null,
    p_action_type: 'WALLET_GRANT',
    p_entity_type: 'customer',
    p_entity_id: customerId,
    p_context: { amount_pence, reason },
  });
  revalidatePath(`/customers/${customerId}`);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { customerId: string };
}) {
  const { db } = await requireAdminPermission('can_manage_users');

  const { data: customer } = await (db as any)
    .from('profiles')
    .select('id, full_name, email, is_blocked, created_at, last_seen_at')
    .eq('id', params.customerId)
    .eq('role', 'customer')
    .maybeSingle();

  if (!customer) notFound();

  const [{ data: bookingRows }, walletRes, { data: ledgerRows }] = await Promise.all([
    (db as any)
      .from('bookings')
      .select('id, status, scheduled_at, total_pence')
      .eq('customer_id', params.customerId)
      .order('scheduled_at', { ascending: false })
      .limit(100),
    (db as any).rpc('wallet_balance', { p_profile_id: params.customerId }),
    (db as any)
      .from('wallet_ledger')
      .select('id, amount_pence, reason, created_at')
      .eq('profile_id', params.customerId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  const walletBalance = typeof walletRes.data === 'number' ? walletRes.data : 0;
  const ledger = (ledgerRows ?? []) as {
    id: number;
    amount_pence: number;
    reason: string;
    created_at: string;
  }[];
  const bookings = (bookingRows ?? []) as {
    id: string;
    status: string;
    scheduled_at: string | null;
    total_pence: number | null;
  }[];

  const total = bookings.length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled' || b.status === 'no_show').length;
  const spend = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_pence ?? 0), 0);
  // ponytail: flat threshold for a risk flag — enough completed history plus a
  // high cancel/no-show rate. Swap for a scored model when there's data to tune it.
  const risky = total >= 3 && cancelled / total > 0.4;

  return (
    <div className="max-w-3xl">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-muted mb-6 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {customer.full_name ?? 'Unnamed customer'}
          </h1>
          <p className="text-sm text-muted mt-1">{customer.email}</p>
          <p className="text-xs text-muted mt-0.5">
            Joined {new Date(customer.created_at).toLocaleDateString('en-GB')}
            {customer.last_seen_at &&
              ` · last seen ${new Date(customer.last_seen_at).toLocaleDateString('en-GB')}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {customer.is_blocked && (
            <span className="text-xs font-semibold text-danger">Blocked</span>
          )}
          {risky && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-3 w-3" /> High cancellation rate
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          ['Bookings', String(total)],
          ['Completed', String(completed)],
          ['Cancelled', String(cancelled)],
          ['Lifetime spend', gbp(spend)],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-lg font-semibold text-ink mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Wallet balance</p>
            <p className="text-lg font-semibold text-ink mt-0.5">{gbp(walletBalance)}</p>
          </div>
          <form action={grantCredit} className="flex items-end gap-2">
            <input type="hidden" name="customer_id" value={customer.id} />
            <label className="text-xs text-muted">
              Grant £
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                className="mt-1 w-24 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <input
              name="reason"
              placeholder="reason (optional)"
              className="rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">
              Grant
            </button>
          </form>
        </div>
        {ledger.length > 0 && (
          <div className="mt-3 border-t border-hairline pt-3 flex flex-col gap-1">
            {ledger.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-xs">
                <span className="text-muted">
                  {new Date(l.created_at).toLocaleDateString('en-GB')} · {l.reason.replace(/_/g, ' ')}
                </span>
                <span className={l.amount_pence >= 0 ? 'text-green-600' : 'text-ink'}>
                  {l.amount_pence >= 0 ? '+' : '−'}
                  {gbp(Math.abs(l.amount_pence))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="font-display text-sm font-bold text-ink mb-3">Booking history</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted">No bookings yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="card flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-ink font-mono-utility">{b.id.slice(0, 8)}</p>
                <p className="text-xs text-muted">
                  {b.scheduled_at
                    ? new Date(b.scheduled_at).toLocaleString('en-GB')
                    : 'Unscheduled'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted capitalize">{b.status.replace(/_/g, ' ')}</span>
                <span className="text-sm text-ink">{gbp(b.total_pence ?? 0)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
