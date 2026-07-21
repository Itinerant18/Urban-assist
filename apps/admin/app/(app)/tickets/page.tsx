import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { TicketCheck, ChevronRight } from 'lucide-react';
import {
  PageHeader,
  TableTile,
  StatusChip,
  statusToneFrom,
  BentoEmpty,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

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
      <PageHeader
        title="Support Tickets"
        subtitle={`${count} total · ${openCount} open.`}
        action={<TicketCheck className="h-5 w-5 text-muted" aria-hidden />}
      />

      {!tickets || tickets.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={TicketCheck} message="No support tickets yet." />
        </TableTile>
      ) : (
        <TableTile>
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink text-sm truncate">
                  {t.category} — {t.description}
                </p>
                <p className="text-xs text-muted font-mono mt-0.5">
                  {new Date(t.created_at).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusChip tone={statusToneFrom(t.status)}>{t.status}</StatusChip>
                <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
              </div>
            </Link>
          ))}
        </TableTile>
      )}
    </div>
  );
}

