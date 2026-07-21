import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPermission } from '../../../../../lib/admin-auth';
import {
  AssignmentEngine,
  resolveAssignmentStrategy,
} from '../../../../../lib/assignment-engine';
import { AssignmentWorkspace } from './assignment-workspace';

export const dynamic = 'force-dynamic';

export default async function AssignBookingPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const { db, user, roles } = await requireAdminPermission('can_manage_bookings');
  const { data: booking, error } = await db
    .from('bookings')
    .select('id, short_code, status, scheduled_at, provider_id, customer_id, category_id, address_id')
    .eq('id', params.bookingId)
    .single();
  if (error || !booking) notFound();

  if (['completed', 'in_progress'].includes(booking.status)) {
    return (
      <div className="card">
        <h1 className="font-display text-xl font-bold text-ink">Booking cannot be assigned</h1>
        <p className="mt-2 text-sm text-muted">Completed and in-progress bookings are locked against provider changes.</p>
        <Link className="btn-secondary mt-5 inline-flex" href={'/bookings/' + booking.id}>Back to booking</Link>
      </div>
    );
  }

  const [categoryRes, addressRes, customerRes, providerRes] = await Promise.all([
    db.from('service_categories').select('name').eq('id', booking.category_id).single(),
    db.from('addresses').select('postcode, city').eq('id', booking.address_id).single(),
    db.from('profiles').select('full_name, email').eq('id', booking.customer_id).single(),
    booking.provider_id
      ? db.from('profiles').select('full_name, email').eq('id', booking.provider_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const engine = new AssignmentEngine(
    db as any,
    { id: user.id, roles },
    resolveAssignmentStrategy('manual_admin'),
    async () => null,
  );
  const candidates = (await engine.getCandidates(booking.id)).filter(
    (candidate) => candidate.provider_id !== booking.provider_id,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-xs text-muted hover:text-ink" href={'/bookings/' + booking.id}>← Booking detail</Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          {booking.provider_id ? 'Reassign' : 'Assign'} {booking.short_code}
        </h1>
        <p className="mt-1 text-sm text-muted">Manual admin strategy · every decision is audited</p>
      </div>

      <section className="grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        <Context label="Service" value={categoryRes.data?.name ?? 'Unknown'} />
        <Context label="Schedule" value={new Date(booking.scheduled_at).toLocaleString()} />
        <Context label="Area" value={[addressRes.data?.city, addressRes.data?.postcode].filter(Boolean).join(' · ')} />
        <Context label="Customer" value={customerRes.data?.full_name ?? customerRes.data?.email ?? 'Unknown'} />
      </section>

      {providerRes.data && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          Currently assigned to <strong>{providerRes.data.full_name ?? providerRes.data.email}</strong>. A reason is required to reassign.
        </p>
      )}

      <AssignmentWorkspace
        booking={{
          id: booking.id,
          shortCode: booking.short_code,
          currentProviderId: booking.provider_id,
        }}
        candidates={candidates}
      />
    </div>
  );
}

function Context({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value || '—'}</p>
    </div>
  );
}

