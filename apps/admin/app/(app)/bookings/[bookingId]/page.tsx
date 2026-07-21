import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminRole } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

function money(pence: number | null | undefined) {
  return '£' + ((pence ?? 0) / 100).toFixed(2);
}

export default async function BookingDetailPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const { db } = await requireAdminRole();
  const { data: booking, error } = await db
    .from('bookings')
    .select('*')
    .eq('id', params.bookingId)
    .single();
  if (error || !booking) notFound();

  const [customerRes, providerRes, addressRes, categoryRes, paymentsRes, statusLogsRes] =
    await Promise.all([
      db.from('profiles').select('id, full_name, email, phone, created_at').eq('id', booking.customer_id).single(),
      booking.provider_id
        ? db.from('profiles').select('id, full_name, email, phone, rating_avg').eq('id', booking.provider_id).single()
        : Promise.resolve({ data: null }),
      db.from('addresses').select('*').eq('id', booking.address_id).single(),
      db.from('service_categories').select('*').eq('id', booking.category_id).single(),
      db.from('payments').select('*').eq('booking_id', booking.id).order('created_at', { ascending: false }),
      (db as any)
        .from('booking_status_logs')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false }),
    ]);

  const canAssign = !['completed', 'in_progress'].includes(booking.status);
  const payment = paymentsRes.data?.[0] as any;
  const address = addressRes.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link className="text-xs text-muted hover:text-ink" href="/bookings">← Bookings</Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">
            {booking.short_code ?? booking.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted">{booking.status.replaceAll('_', ' ')}</p>
        </div>
        {canAssign && (
          <Link className="btn-primary" href={'/bookings/' + booking.id + '/assign'}>
            {booking.provider_id ? 'Reassign provider' : 'Assign provider'}
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card">
          <h2 className="text-sm font-semibold text-ink">Customer</h2>
          <p className="mt-3 text-sm text-ink">{customerRes.data?.full_name ?? 'Unnamed customer'}</p>
          <p className="mt-1 text-xs text-muted">{customerRes.data?.email}</p>
          <p className="mt-1 text-xs text-muted">{customerRes.data?.phone ?? 'No phone'}</p>
        </section>
        <section className="card">
          <h2 className="text-sm font-semibold text-ink">Service & schedule</h2>
          <p className="mt-3 text-sm text-ink">{categoryRes.data?.name ?? 'Unknown category'}</p>
          <p className="mt-1 text-xs text-muted">{new Date(booking.scheduled_at).toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted">{booking.notes ?? 'No customer notes'}</p>
        </section>
        <section className="card">
          <h2 className="text-sm font-semibold text-ink">Provider</h2>
          <p className="mt-3 text-sm text-ink">{providerRes.data?.full_name ?? 'Unassigned'}</p>
          <p className="mt-1 text-xs text-muted">{providerRes.data?.email}</p>
          {providerRes.data && (
            <p className="mt-1 text-xs text-muted">{Number(providerRes.data.rating_avg ?? 0).toFixed(1)} rating</p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-sm font-semibold text-ink">Location</h2>
          <p className="mt-3 text-sm text-ink">
            {[address?.line1, address?.line2, address?.city, address?.postcode].filter(Boolean).join(', ')}
          </p>
          {address?.lat != null && address?.lng != null && (
            <p className="mt-1 font-mono-utility text-xs text-muted">{address.lat}, {address.lng}</p>
          )}
        </section>
        <section className="card">
          <h2 className="text-sm font-semibold text-ink">Payment</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <span className="text-muted">Booking total</span><span className="text-right text-ink">{money(booking.total_pence)}</span>
            <span className="text-muted">Method</span><span className="text-right capitalize text-ink">{booking.payment_method}</span>
            <span className="text-muted">Payment status</span><span className="text-right capitalize text-ink">{payment?.status ?? 'not created'}</span>
            <span className="text-muted">Stripe intent</span><span className="truncate text-right font-mono-utility text-xs text-ink">{payment?.stripe_payment_intent_id ?? '—'}</span>
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="text-sm font-semibold text-ink">Assignment and status history</h2>
        {!statusLogsRes.data?.length ? (
          <p className="mt-3 text-sm text-muted">No admin status changes have been recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-4 border-l border-hairline pl-4">
            {statusLogsRes.data.map((event: any) => (
              <li key={event.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{event.action_type.replaceAll('_', ' ')}</span>
                  <time className="text-xs text-muted">{new Date(event.created_at).toLocaleString()}</time>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {event.from_status ?? 'created'} → {event.to_status} · {event.strategy}
                </p>
                {event.reason && <p className="mt-1 text-xs text-muted">Reason: {event.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
