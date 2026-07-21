import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

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
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Customers</h1>
        <p className="text-sm text-muted mt-1">
          {customers.length}{q ? ` matching “${q}”` : ' most recent'}.
        </p>
      </div>

      <form action="/customers" className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search name or email…"
          className="w-full max-w-sm rounded-lg border border-hairline bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
      </form>

      {customers.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <Users className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No customers found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-ink text-sm">{c.full_name ?? 'Unnamed'}</p>
                  <p className="text-xs text-muted">{c.email}</p>
                </div>
                {c.is_blocked && (
                  <span className="text-xs font-semibold text-danger">Blocked</span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
