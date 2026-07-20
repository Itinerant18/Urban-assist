import { Briefcase, ChevronRight } from 'lucide-react';
import { requireAdminPermission } from '../../../lib/admin-auth';
import { AssignmentPanel } from './assignment-panel';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const { db } = await requireAdminPermission('can_manage_bookings');
  const { data: bookings } = await db
    .from('bookings')
    .select('id, short_code, status, total_pence, scheduled_at, created_at, provider_id')
    .order('created_at', { ascending: false })
    .limit(50);

  const count = bookings?.length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Bookings</h1>
        <p className="text-sm text-muted mt-1">
          {count} recent booking{count !== 1 ? 's' : ''}.
        </p>
      </div>

      {!bookings || bookings.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <Briefcase className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No bookings yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b) => (
            <div key={b.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono-utility text-muted">
                  {b.short_code ?? b.id.slice(0, 8)}
                </span>
                <span className="text-sm text-ink">{b.status}</span>
                <span className="text-xs text-muted">
                  £{((b.total_pence ?? 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {['pending_match', 'unmatched'].includes(b.status) && !b.provider_id && (
                  <AssignmentPanel bookingId={b.id} />
                )}
                <ChevronRight className="h-4 w-4 text-muted" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
