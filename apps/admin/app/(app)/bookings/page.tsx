import { Briefcase, ChevronRight } from 'lucide-react';
import { requireAdminRole } from '../../../lib/admin-auth';
import { AssignmentPanel } from './assignment-panel';

import Link from 'next/link';
import { listAdminBookings, readBookingFilters } from '../../../lib/admin-bookings';

export const dynamic = 'force-dynamic';

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { db } = await requireAdminRole();
  const filters = readBookingFilters(searchParams);
  const [{ bookings, count }, categoriesRes, providersRes, customersRes] = await Promise.all([
    listAdminBookings(db as any, filters),
    db.from('service_categories').select('id, name').order('name'),
    db.from('profiles').select('id, full_name, email').eq('role', 'provider').order('full_name'),
    db.from('profiles').select('id, full_name, email').eq('role', 'customer').order('full_name'),
  ]);
  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) exportParams.set(key, first);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Bookings</h1>
          <p className="mt-1 text-sm text-muted">
            {count} booking{count !== 1 ? 's' : ''} match the current view.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" href={filters.unassigned ? '/bookings' : '/bookings?unassigned=1'}>
            {filters.unassigned ? 'All bookings' : 'Unassigned queue'}
          </Link>
          <Link className="btn-secondary" href={'/api/bookings/export?' + exportParams.toString()}>
            Export CSV
          </Link>
        </div>
      </div>

      <form className="card mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="GET">
        <label className="text-xs text-muted">
          Status
          <select className="input mt-1 w-full" name="status" defaultValue={filters.status ?? ''}>
            <option value="">All statuses</option>
            {['pending_match', 'unmatched', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled', 'disputed'].map((status) => (
              <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          From
          <input className="input mt-1 w-full" type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="text-xs text-muted">
          To
          <input className="input mt-1 w-full" type="date" name="to" defaultValue={filters.to} />
        </label>
        <label className="text-xs text-muted">
          Category
          <select className="input mt-1 w-full" name="category" defaultValue={filters.category ?? ''}>
            <option value="">All categories</option>
            {(categoriesRes.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Postcode
          <input className="input mt-1 w-full" name="postcode" defaultValue={filters.postcode} placeholder="SW1" />
        </label>
        <label className="text-xs text-muted">
          Provider
          <select className="input mt-1 w-full" name="provider" defaultValue={filters.provider ?? ''}>
            <option value="">All providers</option>
            {(providersRes.data ?? []).map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.full_name ?? provider.email}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Customer
          <select className="input mt-1 w-full" name="customer" defaultValue={filters.customer ?? ''}>
            <option value="">All customers</option>
            {(customersRes.data ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.full_name ?? customer.email}</option>
            ))}
          </select>
        </label>
        {filters.unassigned && <input type="hidden" name="unassigned" value="1" />}
        <div className="flex items-end gap-2">
          <button className="btn-primary" type="submit">Apply filters</button>
          <Link className="btn-secondary" href="/bookings">Reset</Link>
        </div>
      </form>

      {!bookings || bookings.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <Briefcase className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No bookings yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono-utility text-muted">{b.short_code ?? b.id.slice(0, 8)}</span>
                  <span className="text-sm font-medium text-ink">{b.status.replaceAll('_', ' ')}</span>
                  <span className="text-xs text-muted">£{((b.total_pence ?? 0) / 100).toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {b.category_name ?? 'Uncategorised'} · {b.postcode ?? 'No postcode'} · {new Date(b.scheduled_at).toLocaleString()}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {b.customer_name ?? b.customer_email ?? 'Unknown customer'} · {b.provider_name ?? 'Unassigned'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {['pending_match', 'unmatched'].includes(b.status) && !b.provider_id && (
                  <AssignmentPanel bookingId={b.id} />
                )}
                {b.provider_id && !['completed', 'in_progress'].includes(b.status) && (
                  <Link className="btn-secondary" href={'/bookings/' + b.id + '/assign'}>Reassign</Link>
                )}
                <Link aria-label="View booking" href={'/bookings/' + b.id}>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
