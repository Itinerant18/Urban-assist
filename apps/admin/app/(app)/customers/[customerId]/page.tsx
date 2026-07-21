import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

import { requireAdminPermission } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

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

  const { data: bookingRows } = await (db as any)
    .from('bookings')
    .select('id, status, scheduled_at, total_pence')
    .eq('customer_id', params.customerId)
    .order('scheduled_at', { ascending: false })
    .limit(100);
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
