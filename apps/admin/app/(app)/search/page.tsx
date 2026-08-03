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

function profileHref(p: { id: string; role: string }) {
  if (p.role === 'provider') return `/providers/${p.id}`;
  if (p.role === 'customer') return `/customers/${p.id}`;
  return '/staff';
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
  let payments: any[] = [];
  let promos: any[] = [];
  let skus: any[] = [];

  if (q) {
    // Strip characters that break PostgREST or() filter syntax.
    const safe = q.replace(/[%,()]/g, '');
    const isUuid = UUID_RE.test(q);
    const idClause = isUuid ? `id.eq.${q},` : '';
    const [p, b, bAddr, t, pay, pr, sk] = await Promise.all([
      db
        .from('profiles')
        .select('id, full_name, email, phone, role, kyc_status')
        .or(`${idClause}full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`)
        .limit(20),
      db
        .from('bookings')
        .select('id, short_code, status, total_pence, created_at')
        .or(`${idClause}short_code.ilike.%${safe}%`)
        .limit(20),
      // Bookings by service address (postcode / city / street).
      db
        .from('bookings')
        .select('id, short_code, status, total_pence, created_at, addresses!inner(city, postcode)')
        .or(`postcode.ilike.%${safe}%,city.ilike.%${safe}%,line1.ilike.%${safe}%`, {
          foreignTable: 'addresses',
        })
        .limit(20),
      db
        .from('support_tickets')
        .select('id, category, description, status, created_at')
        .or(`${idClause}category.ilike.%${safe}%,description.ilike.%${safe}%`)
        .limit(20),
      db
        .from('payments')
        .select('id, booking_id, status, method, amount_pence, stripe_payment_intent_id, created_at')
        .or(
          `${isUuid ? `booking_id.eq.${q},` : ''}stripe_payment_intent_id.ilike.%${safe}%`,
        )
        .limit(10),
      db
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, expires_at, redemption_count')
        .ilike('code', `%${safe}%`)
        .limit(10),
      db
        .from('service_skus')
        .select('id, name, slug, subcategory_id, min_price_pence, is_active')
        .or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`)
        .limit(10),
    ]);
    profiles = p.data ?? [];
    tickets = t.data ?? [];
    payments = pay.data ?? [];
    promos = pr.data ?? [];
    skus = sk.data ?? [];
    // Merge code-match and address-match bookings, dedupe by id.
    const byId = new Map<string, any>();
    for (const row of [...(b.data ?? []), ...(bAddr.data ?? [])]) byId.set(row.id, row);
    bookings = Array.from(byId.values());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Search</h1>
        <p className="text-sm text-muted mt-1">
          {q
            ? `Results for “${q}” across people, bookings, tickets, payments, promos, and services.`
            : 'Search by name, email, phone, booking code, postcode, payment intent, promo code, or service.'}
        </p>
      </div>

      {q && (
        <>
          <Section title="Users & Providers" count={profiles.length}>
            {profiles.map((p) => (
              <Link
                key={p.id}
                href={profileHref(p)}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-medium text-ink">{p.full_name ?? 'Unnamed'}</span>
                <span className="text-xs text-muted">
                  {p.email}
                  {p.phone ? ` · ${p.phone}` : ''} · {p.role} · KYC {p.kyc_status}
                </span>
              </Link>
            ))}
          </Section>

          <Section title="Bookings" count={bookings.length}>
            {bookings.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-mono-utility text-xs text-ink">
                  {b.short_code ?? b.id.slice(0, 8)}
                </span>
                <span className="text-xs text-muted">
                  {b.addresses ? `${b.addresses.city} ${b.addresses.postcode} · ` : ''}
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
                href={`/tickets/${t.id}`}
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

          <Section title="Payments" count={payments.length}>
            {payments.map((p) => (
              <Link
                key={p.id}
                href={`/bookings/${p.booking_id}`}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-mono-utility text-xs text-ink truncate">
                  {p.stripe_payment_intent_id ?? p.id.slice(0, 8)}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  £{((p.amount_pence ?? 0) / 100).toFixed(2)} · {p.method} · {p.status} ·{' '}
                  {new Date(p.created_at).toLocaleDateString('en-GB')}
                </span>
              </Link>
            ))}
          </Section>

          <Section title="Promo Codes" count={promos.length}>
            {promos.map((p) => (
              <Link
                key={p.id}
                href="/promotions"
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-mono-utility text-xs text-ink">{p.code}</span>
                <span className="shrink-0 text-xs text-muted">
                  {p.discount_type === 'percent'
                    ? `${p.discount_value}%`
                    : `£${(p.discount_value / 100).toFixed(2)}`}{' '}
                  · {p.redemption_count} used
                  {p.expires_at
                    ? ` · expires ${new Date(p.expires_at).toLocaleDateString('en-GB')}`
                    : ''}
                </span>
              </Link>
            ))}
          </Section>

          <Section title="Services" count={skus.length}>
            {skus.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.subcategory_id}`}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-bg/40"
              >
                <span className="font-medium text-ink truncate">{s.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  from £{((s.min_price_pence ?? 0) / 100).toFixed(2)}
                  {s.is_active ? '' : ' · inactive'}
                </span>
              </Link>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}
