import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, ChevronRight, TicketCheck } from 'lucide-react';
import { Button, Input } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../../lib/admin-auth';
import {
  computeCustomerValueMetrics,
  isHighCancelRisk,
} from '../../../../lib/admin-customer-metrics';
import { setCustomerBlocked } from '../../../../lib/admin-customers';
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

async function toggleSuspend(formData: FormData) {
  'use server';
  const customerId = String(formData.get('customer_id'));
  const blocked = String(formData.get('blocked')) === '1';
  const reason = String(formData.get('reason') ?? '');
  if (!customerId) return;
  const result = await setCustomerBlocked({ customerId, blocked, reason });
  if (!result.ok) {
    redirect(
      `/customers/${customerId}?suspendError=${encodeURIComponent(result.error)}`,
    );
  }
  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/customers');
  redirect(`/customers/${customerId}`);
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { customerId: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { db } = await requireAdminPermission('can_manage_users');
  const suspendErrorRaw = searchParams.suspendError;
  const suspendError = Array.isArray(suspendErrorRaw)
    ? suspendErrorRaw[0]
    : suspendErrorRaw;

  const { data: customer } = await (db as any)
    .from('profiles')
    .select('id, full_name, email, is_blocked, created_at, last_seen_at')
    .eq('id', params.customerId)
    .eq('role', 'customer')
    .maybeSingle();

  if (!customer) notFound();

  const [{ data: bookingRows }, walletRes, { data: ledgerRows }, { data: ticketRows }, { data: paymentRows }] =
    await Promise.all([
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
      (db as any)
        .from('support_tickets')
        .select('id, category, description, status, created_at')
        .eq('raised_by', params.customerId)
        .order('created_at', { ascending: false })
        .limit(20),
      (db as any)
        .from('payments')
        .select(
          'id, status, method, amount_pence, vat_pence, created_at, booking_id, bookings!inner(customer_id, short_code)',
        )
        .eq('bookings.customer_id', params.customerId)
        .order('created_at', { ascending: false })
        .limit(100),
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
  const tickets = (ticketRows ?? []) as {
    id: string;
    category: string;
    description: string;
    status: string;
    created_at: string;
  }[];
  const payments = (paymentRows ?? []) as {
    id: string;
    status: string;
    method: string;
    amount_pence: number | null;
    vat_pence: number | null;
    created_at: string;
    booking_id: string;
    bookings:
      | { customer_id: string; short_code: string | null }
      | { customer_id: string; short_code: string | null }[]
      | null;
  }[];

  const metrics = computeCustomerValueMetrics(bookings, payments);
  const risky = isHighCancelRisk(metrics);
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_review');

  return (
    <div>
      <div className="mb-2">
        <Link href="/customers" className="text-xs text-muted transition-colors hover:text-ink">
          ← Back to Customers
        </Link>
      </div>

      <PageHeader
        title={customer.full_name ?? 'Unnamed customer'}
        subtitle={`${customer.email ?? 'No email'} · Joined ${new Date(customer.created_at).toLocaleDateString('en-GB')}${customer.last_seen_at ? ` · last seen ${new Date(customer.last_seen_at).toLocaleDateString('en-GB')}` : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={customer.is_blocked ? 'danger' : 'success'}>
              {customer.is_blocked ? 'Suspended' : 'Active'}
            </StatusChip>
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
          value={String(metrics.bookingCount)}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Completed"
          value={String(metrics.completedCount)}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Cancelled / No-show"
          value={String(metrics.cancelledCount)}
          deltaTone={metrics.cancelledCount > 0 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          accent
          label="LTV"
          value={gbp(metrics.ltvPence)}
          sub={
            metrics.completedCount > 0
              ? `Avg ${gbp(metrics.avgOrderPence)} · ${metrics.completedCount} completed`
              : 'No completed bookings'
          }
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Paid (succeeded)"
          value={gbp(metrics.paidPence)}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Open tickets"
          value={String(openTickets.length)}
          deltaTone={openTickets.length > 0 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
      </BentoGrid>

      <BentoTile static className="mb-8 !justify-start border-danger/15">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Account access</p>
            <p className="mt-1 text-xs text-muted">
              Suspended customers keep history and cannot place new bookings until restored.
            </p>
            {suspendError ? (
              <p className="mt-2 text-xs font-semibold text-danger" role="alert">
                {suspendError}
              </p>
            ) : null}
          </div>
          <form action={toggleSuspend} className="flex w-full max-w-md flex-col gap-2 sm:items-end">
            <input type="hidden" name="customer_id" value={customer.id} />
            <input type="hidden" name="blocked" value={customer.is_blocked ? '0' : '1'} />
            <label className="w-full text-xs text-muted">
              {customer.is_blocked ? 'Restore reason (optional)' : 'Suspend reason (required)'}
              <Input
                name="reason"
                required={!customer.is_blocked}
                minLength={customer.is_blocked ? undefined : 3}
                placeholder={customer.is_blocked ? 'Optional note' : 'Abuse, chargebacks, …'}
                className="mt-1"
              />
            </label>
            <Button
              type="submit"
              size="sm"
              variant={customer.is_blocked ? 'outline' : 'danger'}
              className="font-semibold"
            >
              {customer.is_blocked ? 'Restore access' : 'Suspend customer'}
            </Button>
          </form>
        </div>
      </BentoTile>

      <SectionHeader title="Support tickets" />
      {tickets.length === 0 ? (
        <TableTile className="mb-8">
          <BentoEmpty icon={TicketCheck} message="No tickets from this customer." />
        </TableTile>
      ) : (
        <TableTile className="mb-8">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="flex min-h-[44px] items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {t.category} — {t.description}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {new Date(t.created_at).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusChip tone={statusToneFrom(t.status)}>{t.status.replace(/_/g, ' ')}</StatusChip>
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
              </div>
            </Link>
          ))}
        </TableTile>
      )}

      <SectionHeader title="Payment ledger" />
      {payments.length === 0 ? (
        <TableTile className="mb-8">
          <BentoEmpty message="No payments recorded for this customer." />
        </TableTile>
      ) : (
        <TableTile className="mb-8">
          {payments.map((p) => {
            const booking = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
            return (
              <Link
                key={p.id}
                href={`/bookings/${p.booking_id}`}
                className="flex min-h-[44px] items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg/60"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted">
                    #{booking?.short_code ?? p.booking_id.slice(0, 8)} ·{' '}
                    {new Date(p.created_at).toLocaleString('en-GB')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted capitalize">
                    {p.method.replace(/_/g, ' ')}
                    {p.vat_pence ? ` · VAT ${gbp(p.vat_pence)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusChip tone={statusToneFrom(p.status)}>
                    {p.status.replace(/_/g, ' ')}
                  </StatusChip>
                  <span className="font-mono text-sm font-semibold text-ink">
                    {gbp(p.amount_pence ?? 0)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                </div>
              </Link>
            );
          })}
        </TableTile>
      )}

      <BentoTile static className="mb-8 !justify-start">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <p className="text-xs text-muted">Wallet balance</p>
            <p className="mt-0.5 font-mono text-2xl font-bold text-ink">{gbp(walletBalance)}</p>
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
              <Input name="reason" placeholder="Reason (optional)" className="mt-1" />
            </label>
            <Button type="submit" size="sm" className="font-semibold">
              Grant credit
            </Button>
          </form>
        </div>

        {ledger.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted">Recent ledger activity</p>
            <div className="divide-y divide-hairline">
              {ledger.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="text-muted">
                    {new Date(l.created_at).toLocaleDateString('en-GB')} · {l.reason.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={
                      l.amount_pence >= 0
                        ? 'font-mono font-medium text-success'
                        : 'font-mono text-ink'
                    }
                  >
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
              className="flex min-h-[44px] items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg/60"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted">#{b.short_code ?? b.id.slice(0, 8)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {b.scheduled_at
                    ? new Date(b.scheduled_at).toLocaleString('en-GB')
                    : 'Unscheduled'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusChip tone={statusToneFrom(b.status)}>
                  {b.status.replace(/_/g, ' ')}
                </StatusChip>
                <span className="font-mono text-sm font-semibold text-ink">
                  {gbp(b.total_pence ?? 0)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </div>
            </Link>
          ))}
        </TableTile>
      )}
    </div>
  );
}
