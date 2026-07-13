import { getSupabaseServer } from '@urban-assist/db/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
        {title} ({count})
      </h2>
      {count === 0 ? (
        <p className="text-xs text-muted py-2">No matches.</p>
      ) : (
        <div className="border border-hairline rounded-xl overflow-hidden bg-white shadow-card divide-y divide-hairline">
          {children}
        </div>
      )}
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? '').trim();
  const db = getSupabaseServer();

  let profiles: any[] = [];
  let bookings: any[] = [];
  let tickets: any[] = [];

  if (q) {
    // Strip characters that break PostgREST or() filter syntax.
    const safe = q.replace(/[%,()]/g, '');
    const idClause = UUID_RE.test(q) ? `id.eq.${q},` : '';
    const [p, b, t] = await Promise.all([
      db
        .from('profiles')
        .select('id, full_name, email, role, kyc_status')
        .or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`)
        .limit(20),
      db
        .from('bookings')
        .select('id, short_code, status, total_pence, created_at')
        .or(`${idClause}short_code.ilike.%${safe}%`)
        .limit(20),
      db
        .from('support_tickets')
        .select('id, category, description, status, created_at')
        .or(`${idClause}category.ilike.%${safe}%,description.ilike.%${safe}%`)
        .limit(20),
    ]);
    profiles = p.data ?? [];
    bookings = b.data ?? [];
    tickets = t.data ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Search</h1>
        <p className="text-sm text-muted mt-1">
          {q ? `Results for “${q}”.` : 'Enter a query in the search box.'}
        </p>
      </div>

      {q && (
        <>
          <Section title="Users & Providers" count={profiles.length}>
            {profiles.map((p) => (
              <Link
                key={p.id}
                href="/providers"
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-medium text-ink">{p.full_name ?? 'Unnamed'}</span>
                <span className="text-xs text-muted">
                  {p.email} · {p.role} · KYC {p.kyc_status}
                </span>
              </Link>
            ))}
          </Section>

          <Section title="Bookings" count={bookings.length}>
            {bookings.map((b) => (
              <Link
                key={b.id}
                href="/bookings"
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-mono-utility text-xs text-ink">
                  {b.short_code ?? b.id.slice(0, 8)}
                </span>
                <span className="text-xs text-muted">
                  {b.status} · £{((b.total_pence ?? 0) / 100).toFixed(2)} ·{' '}
                  {new Date(b.created_at).toLocaleDateString('en-GB')}
                </span>
              </Link>
            ))}
          </Section>

          <Section title="Support Tickets" count={tickets.length}>
            {tickets.map((t) => (
              <Link
                key={t.id}
                href="/tickets"
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-medium text-ink truncate">
                  {t.category} — {t.description}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {t.status} · {new Date(t.created_at).toLocaleDateString('en-GB')}
                </span>
              </Link>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}
