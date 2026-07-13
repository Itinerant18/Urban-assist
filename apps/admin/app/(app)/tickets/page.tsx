import { getSupabaseServer } from '@urban-assist/db/server';
import { TicketCheck, ChevronRight } from 'lucide-react';
import { Badge } from '@urban-assist/ui';

export const dynamic = 'force-dynamic';

function statusTone(status: string) {
  if (status === 'open') return 'accent' as const;
  if (status === 'resolved') return 'success' as const;
  return 'muted' as const;
}

export default async function SupportTicketsPage() {
  const db = getSupabaseServer();
  const { data: tickets } = await db
    .from('support_tickets')
    .select('id, category, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const count = tickets?.length ?? 0;
  const openCount = tickets?.filter((t) => t.status === 'open').length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Support Tickets</h1>
        <p className="text-sm text-muted mt-1">
          {count} total · {openCount} open.
        </p>
      </div>

      {!tickets || tickets.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <TicketCheck className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No support tickets yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium text-ink text-sm truncate">
                    {t.category} — {t.description}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <Badge tone={statusTone(t.status)}>{t.status}</Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-muted shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
