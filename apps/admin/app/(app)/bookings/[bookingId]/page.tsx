import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminRole } from '../../../../lib/admin-auth';
import {
  PageHeader,
  BentoGrid,
  BentoTile,
  SectionHeader,
  StatusChip,
  statusToneFrom,
  TableTile,
  BentoEmpty,
} from '@/components/bento';

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
    <div>
      <div className="mb-2">
        <Link className="text-xs text-muted hover:text-ink transition-colors" href="/bookings">
          ← Back to Bookings
        </Link>
      </div>

      <PageHeader
        title={booking.short_code ? `#${booking.short_code}` : booking.id.slice(0, 8)}
        subtitle={`Booking created on ${new Date(booking.created_at).toLocaleDateString('en-GB')}`}
        action={
          <div className="flex items-center gap-3">
            <StatusChip tone={statusToneFrom(booking.status)}>
              {booking.status.replaceAll('_', ' ')}
            </StatusChip>
            {canAssign && (
              <Link
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
                href={'/bookings/' + booking.id + '/assign'}
              >
                {booking.provider_id ? 'Reassign provider' : 'Assign provider'}
              </Link>
            )}
          </div>
        }
      />

      <BentoGrid className="mb-6">
        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-4 !justify-start">
          <SectionHeader title="Customer" />
          <div className="space-y-1">
            <p className="font-semibold text-ink text-sm">
              {customerRes.data?.full_name ?? 'Unnamed customer'}
            </p>
            <p className="text-xs text-muted font-mono">{customerRes.data?.email ?? '—'}</p>
            <p className="text-xs text-muted">{customerRes.data?.phone ?? 'No phone number'}</p>
          </div>
        </BentoTile>

        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-4 !justify-start">
          <SectionHeader title="Service & schedule" />
          <div className="space-y-1">
            <p className="font-semibold text-ink text-sm">
              {categoryRes.data?.name ?? 'Unknown category'}
            </p>
            <p className="text-xs text-muted font-mono">
              {new Date(booking.scheduled_at).toLocaleString('en-GB')}
            </p>
            <p className="text-xs text-muted italic">{booking.notes ?? 'No customer notes'}</p>
          </div>
        </BentoTile>

        <BentoTile static className="col-span-2 md:col-span-6 lg:col-span-4 !justify-start">
          <SectionHeader title="Provider" />
          <div className="space-y-1">
            <p className="font-semibold text-ink text-sm">
              {providerRes.data?.full_name ?? 'Unassigned'}
            </p>
            <p className="text-xs text-muted font-mono">{providerRes.data?.email ?? '—'}</p>
            {providerRes.data ? (
              <p className="text-xs text-muted font-mono">
                ★ {Number(providerRes.data.rating_avg ?? 0).toFixed(1)} rating
              </p>
            ) : null}
          </div>
        </BentoTile>

        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-6 !justify-start">
          <SectionHeader title="Location" />
          <p className="text-sm text-ink font-medium">
            {[address?.line1, address?.line2, address?.city, address?.postcode]
              .filter(Boolean)
              .join(', ') || 'No address details'}
          </p>
          {address?.lat != null && address?.lng != null ? (
            <p className="mt-2 text-xs font-mono text-muted">
              Coordinates: {address.lat}, {address.lng}
            </p>
          ) : null}
        </BentoTile>

        <BentoTile static className="col-span-2 md:col-span-3 lg:col-span-6 !justify-start">
          <SectionHeader title="Payment details" />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-muted">Total amount</span>
            <span className="text-right font-mono font-semibold text-ink">
              {money(booking.total_pence)}
            </span>

            <span className="text-muted">Payment method</span>
            <span className="text-right capitalize text-ink">
              {booking.payment_method ?? '—'}
            </span>

            <span className="text-muted">Payment status</span>
            <span className="text-right">
              <StatusChip tone={statusToneFrom(payment?.status ?? 'pending')}>
                {payment?.status ?? 'not created'}
              </StatusChip>
            </span>

            <span className="text-muted">Stripe Intent</span>
            <span className="text-right font-mono text-[11px] text-muted truncate">
              {payment?.stripe_payment_intent_id ?? '—'}
            </span>
          </div>
        </BentoTile>
      </BentoGrid>

      <SectionHeader title="Assignment and status history" />
      <TableTile>
        {!statusLogsRes.data?.length ? (
          <BentoEmpty message="No status changes recorded yet." className="py-8" />
        ) : (
          statusLogsRes.data.map((event: any) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink capitalize">
                  {(event.action_type ?? '').replaceAll('_', ' ')}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  <span className="capitalize">{event.from_status ?? 'created'}</span> →{' '}
                  <span className="font-medium text-ink capitalize">{event.to_status}</span>
                  {event.strategy ? ` · ${event.strategy}` : ''}
                  {event.reason ? ` (${event.reason})` : ''}
                </p>
              </div>
              <time className="text-xs font-mono text-muted shrink-0">
                {new Date(event.created_at).toLocaleString('en-GB')}
              </time>
            </div>
          ))
        )}
      </TableTile>
    </div>
  );
}

