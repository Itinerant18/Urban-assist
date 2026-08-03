import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { Button, Input } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { readCustomerListFilters } from '../../../lib/admin-customer-filters';
import {
  PageHeader,
  BentoTile,
  TableTile,
  StatusChip,
  BentoEmpty,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

type CustomerSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_blocked: boolean;
  created_at: string;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { db } = await requireAdminPermission('can_manage_users');
  const filters = readCustomerListFilters(searchParams);
  const adminDb = db as any;

  let areaIds: Set<string> | null = null;
  if (filters.city || filters.postcode) {
    let addrQuery = adminDb.from('addresses').select('profile_id');
    if (filters.city) addrQuery = addrQuery.ilike('city', `%${filters.city}%`);
    if (filters.postcode) addrQuery = addrQuery.ilike('postcode', `${filters.postcode}%`);
    const { data: addrs } = await addrQuery.limit(500);
    areaIds = new Set(
      ((addrs ?? []) as { profile_id: string }[]).map((row) => row.profile_id),
    );
  }

  if (areaIds && areaIds.size === 0) {
    return (
      <div>
        <PageHeader title="Customers" subtitle="0 matching filters." />
        <FilterForm filters={filters} />
        <TableTile>
          <BentoEmpty icon={Users} message="No customers in that area." />
        </TableTile>
      </div>
    );
  }

  let query = adminDb
    .from('profiles')
    .select('id, full_name, email, is_blocked, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(50);
  // ponytail: OR-ilike search over name+email; add a trigram index if the
  // customer table outgrows a seq scan at 50-row pages.
  if (filters.q) query = query.or(`full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);
  if (areaIds) query = query.in('id', Array.from(areaIds));

  const { data } = await query;
  const customers = (data ?? []) as CustomerSummary[];
  const hasFilters = Boolean(filters.q || filters.city || filters.postcode);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length}${hasFilters ? ' matching filters' : ' most recent'}.`}
      />

      <FilterForm filters={filters} />

      {customers.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={Users} message="No customers found." />
        </TableTile>
      ) : (
        <TableTile>
          <div className="divide-y divide-hairline sm:hidden">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="tap flex items-center gap-3 p-4 hover:bg-bg/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {c.full_name ?? 'Unnamed'}
                  </p>
                  <p className="mt-1 truncate font-mono-utility text-xs text-muted">{c.email}</p>
                  <p className="mt-2 text-xs text-muted">
                    Joined {new Date(c.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                {c.is_blocked ? <StatusChip tone="danger">Suspended</StatusChip> : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </Link>
            ))}
          </div>
          <div className="hidden divide-y divide-hairline sm:block">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex min-h-[44px] items-center gap-3 px-5 py-3 transition-colors hover:bg-bg/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {c.full_name ?? 'Unnamed'}
                  </p>
                  <p className="truncate font-mono text-xs text-muted">{c.email}</p>
                </div>
                {c.is_blocked ? <StatusChip tone="danger">Suspended</StatusChip> : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </Link>
            ))}
          </div>
        </TableTile>
      )}
    </div>
  );
}

function FilterForm({
  filters,
}: {
  filters: { q: string | null; city: string | null; postcode: string | null };
}) {
  return (
    <BentoTile static className="mb-4 !justify-start">
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="GET" action="/customers">
        <label className="text-xs text-muted">
          Search
          <Input
            type="search"
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="Name or email…"
            className="mt-1"
          />
        </label>
        <label className="text-xs text-muted">
          City
          <Input
            name="city"
            defaultValue={filters.city ?? ''}
            placeholder="London"
            className="mt-1"
          />
        </label>
        <label className="text-xs text-muted">
          Postcode
          <Input
            name="postcode"
            defaultValue={filters.postcode ?? ''}
            placeholder="SW1"
            className="mt-1 uppercase"
          />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" className="font-semibold">
            Apply
          </Button>
          <Link
            href="/customers"
            className="rounded-xl border border-hairline bg-white px-3 py-2 text-xs text-ink transition-colors hover:bg-bg"
          >
            Reset
          </Link>
        </div>
      </form>
    </BentoTile>
  );
}
