import * as React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ChevronLeft } from 'lucide-react';
import { TicketClient } from './ticket-client';

export const dynamic = 'force-dynamic';

export default async function SupportTicketDetailPage({ params }: { params: { id: string } }) {
  const db = getSupabaseServer();

  // 1. Fetch support ticket details
  const { data: ticket, error } = await db
    .from('support_tickets')
    .select('*, customer:profiles!support_tickets_raised_by_fkey(*)')
    .eq('id', params.id)
    .single();

  if (error || !ticket) {
    notFound();
  }

  // 2. Fetch booking details if attached
  let booking = null;
  let provider = null;
  if (ticket.booking_id) {
    const { data: b } = await db
      .from('bookings')
      .select('*, address:addresses(*)')
      .eq('id', ticket.booking_id)
      .single();
    booking = b;

    if (booking?.provider_id) {
      const { data: p } = await db
        .from('profiles')
        .select('*')
        .eq('id', booking.provider_id)
        .single();
      provider = p;
    }
  }

  // 3. Fetch Left Sidebar: support tickets list queue
  const { data: queue } = await db
    .from('support_tickets')
    .select('id, category, status')
    .in('status', ['open', 'in_review'])
    .order('created_at', { ascending: false });

  // 4. Fetch consolidated system audit timeline & analytics events
  const timeline: any[] = [];

  // Fetch from audit_log
  const { data: auditEvents } = await db
    .from('audit_log')
    .select('*, actor:profiles!audit_log_actor_id_fkey(full_name)')
    .or(`entity_id.eq.${params.id}${ticket.booking_id ? `,entity_id.eq.${ticket.booking_id}` : ''}`)
    .order('created_at', { ascending: true });

  if (auditEvents) {
    auditEvents.forEach((ev) => {
      timeline.push({
        id: `audit-${ev.id}`,
        timestamp: ev.created_at,
        actor: ev.actor?.full_name || 'System',
        action: ev.action,
        description: `${ev.action.replace(/_/g, ' ').replace(/\./g, ' ')}`,
        metadata: ev.new_data || ev.old_data || {},
      });
    });
  }

  // Fetch from analytics_events
  const { data: analyticsEvents } = await db
    .from('analytics_events')
    .select('*, profile:profiles(full_name)')
    .or(`profile_id.eq.${ticket.raised_by}${provider ? `,profile_id.eq.${provider.id}` : ''}`)
    .order('created_at', { ascending: true });

  if (analyticsEvents) {
    analyticsEvents.forEach((ev) => {
      // Filter client events relevant to this ticket/booking
      const payload = ev.payload || {};
      const isRelevant = 
        payload.ticket_id === params.id ||
        (ticket.booking_id && payload.booking_id === ticket.booking_id) ||
        ev.type === 'ticket_note';

      if (isRelevant) {
        timeline.push({
          id: `analytics-${ev.id}`,
          timestamp: ev.created_at,
          actor: ev.profile?.full_name || 'System',
          action: ev.type,
          description: ev.type === 'ticket_note' ? `Internal Note Added` : `${ev.type.replace(/_/g, ' ')}`,
          metadata: payload,
        });
      }
    });
  }

  // Sort timeline chronologically (earliest to latest)
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="h-full flex flex-col -mx-4 lg:-mx-8 -my-6">
      {/* Mobile Header back link */}
      <div className="lg:hidden bg-white border-b border-hairline p-4 flex items-center gap-3">
        <Link href="/tickets" className="text-ink">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bold text-ink text-sm">Ticket #{ticket.id.slice(0, 8)}</h1>
          <p className="text-[10px] text-muted">{ticket.category}</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Ticket Queue (Desktop) */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-hairline bg-white">
          <div className="p-4 border-b border-hairline bg-bg/20">
            <h2 className="font-bold text-ink text-sm">Open Tickets ({queue?.length ?? 0})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {queue?.map((q) => (
              <Link
                key={q.id}
                href={`/tickets/${q.id}`}
                className={`block p-3 rounded-xl transition ${
                  q.id === ticket.id
                    ? 'bg-ink text-bg font-semibold'
                    : 'text-ink hover:bg-hairline/30'
                }`}
              >
                <div className="text-xs truncate">{q.category}</div>
                <div className={`text-[10px] uppercase font-mono-utility mt-1 ${q.id === ticket.id ? 'text-bg/85 font-semibold' : 'text-accent'}`}>
                  {q.status}
                </div>
              </Link>
            ))}
          </div>
        </aside>

        {/* Interactive Client Panel (Center Timeline & Right actions) */}
        <main className="flex-1 flex flex-col bg-bg/50 overflow-hidden">
          <TicketClient
            ticket={ticket}
            booking={booking}
            provider={provider}
            timeline={timeline}
          />
        </main>
      </div>
    </div>
  );
}
