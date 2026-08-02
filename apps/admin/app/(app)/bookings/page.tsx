import { Briefcase, ChevronRight } from 'lucide-react';
import { requireAdminRole } from '../../../lib/admin-auth';
import { AssignmentPanel } from './assignment-panel';

import Link from 'next/link';
import { Button, Input, Select } from '@urban-assist/ui';
import { listAdminBookings, readBookingFilters } from '../../../lib/admin-bookings';
import {
  PageHeader,
  BentoTile,
  TableTile,
  StatusChip,
  statusToneFrom,
  BentoEmpty,
} from '@/components/bento';

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
      <PageHeader
        title="Bookings"
        subtitle={`${count} booking${count !== 1 ? 's' : ''} match the current view.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
              href={filters.unassigned ? '/bookings' : '/bookings?unassigned=1'}
            >
              {filters.unassigned ? 'All bookings' : 'Unassigned queue'}
            </Link>
            <Link
              className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
              href={'/api/bookings/export?' + exportParams.toString()}
            >
              Export CSV
            </Link>
          </div>
        }
      />

      <BentoTile static className="mb-6 !justify-start">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="GET">
          <label className="text-xs text-muted">
            Status
            <Select className="mt-1" name="status" defaultValue={filters.status ?? ''}>
              <option value="">All statuses</option>
              {[
                'pending_match',
                'unmatched',
                'assigned',
                'on_the_way',
                'arrived',
                'in_progress',
                'completed',
                'cancelled',
                'disputed',
              ].map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            From
            <Input className="mt-1" type="date" name="from" defaultValue={filters.from} />
          </label>
          <label className="text-xs text-muted">
            To
            <Input className="mt-1" type="date" name="to" defaultValue={filters.to} />
          </label>
          <label className="text-xs text-muted">
            Category
            <Select className="mt-1" name="category" defaultValue={filters.category ?? ''}>
              <option value="">All categories</option>
              {(categoriesRes.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            Postcode
            <Input
              className="mt-1"
              name="postcode"
              defaultValue={filters.postcode}
              placeholder="SW1"
            />
          </label>
          <label className="text-xs text-muted">
            Provider
            <Select className="mt-1" name="provider" defaultValue={filters.provider ?? ''}>
              <option value="">All providers</option>
              {(providersRes.data ?? []).map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.full_name ?? provider.email}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            Customer
            <Select className="mt-1" name="customer" defaultValue={filters.customer ?? ''}>
              <option value="">All customers</option>
              {(customersRes.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name ?? customer.email}
                </option>
              ))}
            </Select>
          </label>
          {filters.unassigned && <input type="hidden" name="unassigned" value="1" />}
          <div className="flex items-end gap-2">
            <Button type="submit" className="font-semibold">
              Apply filters
            </Button>
            <Link
              className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink hover:bg-bg transition-colors"
              href="/bookings"
            >
              Reset
            </Link>
          </div>
        </form>
      </BentoTile>

      {!bookings || bookings.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={Briefcase} message="No bookings yet." />
        </TableTile>
      ) : (
        <TableTile>
          <div className="divide-y divide-hairline sm:hidden">
            {bookings.map((b) => (
              <article key={b.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-utility text-xs text-muted">{b.short_code ?? b.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{b.category_name ?? 'Uncategorised'}</p>
                  </div>
                  <StatusChip tone={statusToneFrom(b.status)}>{b.status.replaceAll('_', ' ')}</StatusChip>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div><dt className="text-muted">Customer</dt><dd className="mt-0.5 truncate text-ink">{b.customer_name ?? b.customer_email ?? 'Unknown'}</dd></div>
                  <div><dt className="text-muted">Provider</dt><dd className="mt-0.5 truncate text-ink">{b.provider_name ?? 'Unassigned'}</dd></div>
                  <div><dt className="text-muted">Schedule</dt><dd className="mt-0.5 text-ink">{new Date(b.scheduled_at).toLocaleString()}</dd></div>
                  <div><dt className="text-muted">Total</dt><dd className="mt-0.5 font-mono-utility text-ink">£{((b.total_pence ?? 0) / 100).toFixed(2)}</dd></div>
                </dl>
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-3">
                  {['pending_match', 'unmatched'].includes(b.status) && !b.provider_id && <AssignmentPanel bookingId={b.id} />}
                  {b.provider_id && !['completed', 'in_progress'].includes(b.status) && (
                    <Link className="tap inline-flex items-center rounded-xl border border-hairline bg-white px-3 text-xs text-ink" href={'/bookings/' + b.id + '/assign'}>Reassign</Link>
                  )}
                  <Link aria-label="View booking" href={'/bookings/' + b.id} className="tap inline-flex items-center justify-center rounded-xl border border-hairline bg-white">
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden divide-y divide-hairline sm:block">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-muted">
                    {b.short_code ?? b.id.slice(0, 8)}
                  </span>
                  <StatusChip tone={statusToneFrom(b.status)}>
                    {b.status.replaceAll('_', ' ')}
                  </StatusChip>
                  <span className="text-xs font-mono text-ink">
                    £{((b.total_pence ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {b.category_name ?? 'Uncategorised'} · {b.postcode ?? 'No postcode'} ·{' '}
                  {new Date(b.scheduled_at).toLocaleString()}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {b.customer_name ?? b.customer_email ?? 'Unknown customer'} ·{' '}
                  {b.provider_name ?? 'Unassigned'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {['pending_match', 'unmatched'].includes(b.status) && !b.provider_id && (
                  <AssignmentPanel bookingId={b.id} />
                )}
                {b.provider_id && !['completed', 'in_progress'].includes(b.status) && (
                  <Link
                    className="rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg transition-colors"
                    href={'/bookings/' + b.id + '/assign'}
                  >
                    Reassign
                  </Link>
                )}
                <Link aria-label="View booking" href={'/bookings/' + b.id} className="tap">
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </div>
            </div>
          ))}
          </div>
        </TableTile>
      )}
    </div>
  );
}
