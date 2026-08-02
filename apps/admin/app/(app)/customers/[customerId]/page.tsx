import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button, Input } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../../lib/admin-auth';
import {
  PageHeader,
  BentoGrid,
  BentoTile,
  StatTile,
  SectionHeader,
  StatusChip,
  statusToneFrom,
  TableTile,
  BentoEmpty,
} from '@/components/bento';

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
      .select('id, short_code, status, scheduled_at, total_pence')
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
    short_code: string | null;
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
  const risky = total >= 3 && cancelled / total > 0.4;

  return (
    <div>
      <div className="mb-2">
        <Link href="/customers" className="text-xs text-muted hover:text-ink transition-colors">
          ← Back to Customers
        </Link>
      </div>

      <PageHeader
        title={customer.full_name ?? 'Unnamed customer'}
        subtitle={`${customer.email ?? 'No email'} · Joined ${new Date(customer.created_at).toLocaleDateString('en-GB')}${customer.last_seen_at ? ` · last seen ${new Date(customer.last_seen_at).toLocaleDateString('en-GB')}` : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {customer.is_blocked ? <StatusChip tone="danger">Blocked</StatusChip> : null}
            {risky ? (
              <StatusChip tone="danger" className="gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden /> High cancellation rate
              </StatusChip>
            ) : null}
          </div>
        }
      />

      <BentoGrid className="mb-6">
        <StatTile
          label="Total bookings"
          value={String(total)}
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
        <StatTile
          label="Completed"
          value={String(completed)}
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
        <StatTile
          label="Cancelled / No-show"
          value={String(cancelled)}
          deltaTone={cancelled > 0 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
        <StatTile
          accent
          label="Lifetime spend"
          value={gbp(spend)}
          className="col-span-1 md:col-span-3 lg:col-span-3"
        />
      </BentoGrid>

      {/* Wallet tile */}
      <BentoTile static className="mb-8 !justify-start">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <p className="text-xs text-muted">Wallet balance</p>
            <p className="text-2xl font-bold font-mono text-ink mt-0.5">{gbp(walletBalance)}</p>
          </div>
          <form action={grantCredit} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="customer_id" value={customer.id} />
            <label className="text-xs text-muted">
              Grant £
              <Input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="10.00"
                className="mt-1 w-24"
              />
            </label>
            <label className="text-xs text-muted">
              Reason
              <Input
                name="reason"
                placeholder="Reason (optional)"
                className="mt-1"
              />
            </label>
            <Button type="submit" size="sm" className="font-semibold">
              Grant credit
            </Button>
          </form>
        </div>

        {ledger.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted mb-2">Recent ledger activity</p>
            <div className="divide-y divide-hairline">
              {ledger.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="text-muted">
                    {new Date(l.created_at).toLocaleDateString('en-GB')} · {l.reason.replace(/_/g, ' ')}
                  </span>
                  <span className={l.amount_pence >= 0 ? 'text-success font-mono font-medium' : 'text-ink font-mono'}>
                    {l.amount_pence >= 0 ? '+' : '−'}
                    {gbp(Math.abs(l.amount_pence))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </BentoTile>

      <SectionHeader title="Booking history" />
      {bookings.length === 0 ? (
        <TableTile>
          <BentoEmpty message="No bookings for this customer yet." />
        </TableTile>
      ) : (
        <TableTile>
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-mono text-muted">
                  #{b.short_code ?? b.id.slice(0, 8)}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {b.scheduled_at
                    ? new Date(b.scheduled_at).toLocaleString('en-GB')
                    : 'Unscheduled'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusChip tone={statusToneFrom(b.status)}>
                  {b.status.replace(/_/g, ' ')}
                </StatusChip>
                <span className="text-sm font-mono font-semibold text-ink">
                  {gbp(b.total_pence ?? 0)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
              </div>
            </Link>
          ))}
        </TableTile>
      )}
    </div>
  );
}

