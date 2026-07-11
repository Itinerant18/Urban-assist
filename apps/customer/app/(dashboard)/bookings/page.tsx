import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Badge, EmptyState, Button } from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';

export const dynamic = 'force-dynamic';

const statusTone: Record<string, 'accent' | 'success' | 'danger' | 'muted'> = {
  pending_match: 'accent',
  assigned: 'accent',
  on_the_way: 'accent',
  arrived: 'accent',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'danger',
  unmatched: 'danger',
  disputed: 'danger',
};

// Tab → bookings.status values. "active" includes attention states (unmatched, disputed).
const TABS = {
  active: ['pending_match', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'unmatched', 'disputed'],
  completed: ['completed'],
  cancelled: ['cancelled'],
} as const;
type Tab = keyof typeof TABS;

const EMPTY_COPY: Record<Tab, { title: string; description: string }> = {
  active: { title: 'No active bookings', description: 'Find a service to get started.' },
  completed: { title: 'No completed bookings yet', description: 'Finished jobs will appear here with their invoices.' },
  cancelled: { title: 'No cancelled bookings', description: 'Good news — nothing here.' },
};

export default async function BookingsList({ searchParams }: { searchParams: { tab?: string } }) {
  const tab: Tab = Object.hasOwn(TABS, searchParams.tab ?? '') ? (searchParams.tab as Tab) : 'active';
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  const { data: bookings } = await db
    .from('bookings')
    .select('id, short_code, scheduled_at, status, total_pence, provider_service_id, category:service_categories(name), provider:profiles!bookings_provider_id_fkey(full_name)')
    .eq('customer_id', user!.id)
    .in('status', [...TABS[tab]])
    .order('scheduled_at', { ascending: false });

  // Which completed bookings the customer already reviewed (drives the "Rate" nudge).
  let reviewedIds = new Set<string>();
  if (tab === 'completed' && bookings?.length) {
    const { data: reviews } = await db
      .from('reviews')
      .select('booking_id')
      .eq('author_id', user!.id)
      .in('booking_id', bookings.map((b: any) => b.id));
    reviewedIds = new Set((reviews ?? []).map((r: any) => r.booking_id));
  }

  return (
    <div className="space-y-4 py-2">
      <h1 className="font-display text-xl">Your bookings</h1>

      <div className="flex gap-2">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={t === 'active' ? '/bookings' : `/bookings?tab=${t}`}
            className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${
              t === tab
                ? 'border-ink bg-ink text-white'
                : 'border-hairline bg-white text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {!bookings?.length ? (
        <EmptyState
          title={EMPTY_COPY[tab].title}
          description={EMPTY_COPY[tab].description}
          action={tab === 'active' ? <Link href="/"><Button>Find a service</Button></Link> : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {bookings.map((b: any) => (
            <li key={b.id}>
              <Card className="flex items-center gap-4 transition hover:border-ink">
                <Link href={`/bookings/${b.id}`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.category?.name ?? 'Service'}</span>
                    <Badge tone={statusTone[b.status] ?? 'muted'}>{prettyStatus(b.status)}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {ukDateTime(b.scheduled_at)} · {b.provider?.full_name ?? '—'}
                  </div>
                  <div className="mt-1 font-mono-utility text-muted">#{b.short_code}</div>
                </Link>
                <div className="flex flex-col items-end gap-2">
                  <div className="font-display text-lg">{pence(b.total_pence)}</div>
                  {tab === 'completed' && (
                    <div className="flex gap-2">
                      {!reviewedIds.has(b.id) && (
                        <Link href={`/bookings/${b.id}`}>
                          <Button size="sm">Rate service</Button>
                        </Link>
                      )}
                      {b.provider_service_id && (
                        <Link href={`/book/${b.provider_service_id}`}>
                          <Button size="sm" variant="outline">Book again</Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function prettyStatus(s: string) {
  return s.replace(/_/g, ' ');
}
