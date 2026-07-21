import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
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
  const q = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.trim();

  let query = (db as any)
    .from('profiles')
    .select('id, full_name, email, is_blocked, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(50);
  // ponytail: OR-ilike search over name+email; add a trigram index if the
  // customer table outgrows a seq scan at 50-row pages.
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data } = await query;
  const customers = (data ?? []) as CustomerSummary[];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length}${q ? ` matching “${q}”` : ' most recent'}.`}
      />

      <BentoTile static className="mb-4 !justify-start !p-4 max-w-md">
        <form action="/customers">
          <label className="text-xs text-muted">
            Search
            <input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search name or email…"
              className="mt-1 w-full rounded-xl border border-hairline bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </label>
        </form>
      </BentoTile>

      {customers.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={Users} message="No customers found." />
        </TableTile>
      ) : (
        <TableTile>
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink text-sm truncate">{c.full_name ?? 'Unnamed'}</p>
                <p className="text-xs text-muted font-mono truncate">{c.email}</p>
              </div>
              {c.is_blocked ? <StatusChip tone="danger">Blocked</StatusChip> : null}
              <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
            </Link>
          ))}
        </TableTile>
      )}
    </div>
  );
}
