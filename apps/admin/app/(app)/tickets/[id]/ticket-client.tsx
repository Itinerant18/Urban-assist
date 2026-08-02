'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Field } from '@urban-assist/ui';
import { Clock, DollarSign, MessageSquare, AlertOctagon } from 'lucide-react';
import { pence } from '@urban-assist/lib';

interface Ticket {
  id: string;
  booking_id: string | null;
  raised_by: string;
  category: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  created_at: string;
  customer?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Booking {
  id: string;
  short_code: string;
  status: string;
  total_pence: number;
  scheduled_at: string;
  address?: {
    line1: string;
    city: string;
    postcode: string;
  } | null;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  description: string;
  metadata: any;
}

export function TicketClient({
  ticket,
  booking,
  provider,
  timeline,
}: {
  ticket: Ticket;
  booking: Booking | null;
  provider: any | null;
  timeline: TimelineEvent[];
}) {
  const router = useRouter();
  const [ticketStatus, setTicketStatus] = React.useState(ticket.status);
  const [internalNote, setInternalNote] = React.useState('');
  const [penaltyReason, setPenaltyReason] = React.useState('No-show / Dispute resolution');
  const [showPenaltyForm, setShowPenaltyForm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleStatusChange = async (newStatus: 'open' | 'in_review' | 'resolved' | 'closed') => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setTicketStatus(newStatus);
      setSuccess(`Ticket status updated to ${newStatus}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (action: 'refund' | 'penalize' | 'note', payload?: any) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to execute ${action}`);
      }
      setSuccess(`${action.toUpperCase()} action successfully recorded!`);
      if (action === 'note') setInternalNote('');
      if (action === 'penalize') setShowPenaltyForm(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Center: Issue Detail & System Timeline */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
        {/* Ticket Title Header */}
        <div className="border-b border-hairline pb-4 flex justify-between items-start">
          <div>
            <h1 className="font-display font-bold text-2xl text-ink">Ticket #{ticket.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted mt-1">
              Raised by: <strong className="text-ink">{ticket.customer?.full_name || 'Unnamed'}</strong> ({ticket.customer?.email}) ·{' '}
              {new Date(ticket.created_at).toLocaleDateString('en-GB')}
            </p>
          </div>
          <Badge tone={ticketStatus === 'resolved' ? 'success' : ticketStatus === 'open' ? 'accent' : 'muted'}>
            {ticketStatus.toUpperCase()}
          </Badge>
        </div>

        {/* Issue Card */}
        <Card className="p-4 border border-hairline bg-white rounded-2xl space-y-2">
          <h2 className="text-xs font-bold text-muted uppercase font-mono-utility">Customer Issue Category: {ticket.category}</h2>
          <p className="text-sm font-medium text-ink leading-relaxed font-sans mt-2">"{ticket.description}"</p>
        </Card>

        {/* Booking Context */}
        {booking && (
          <Card className="p-4 border border-hairline bg-white rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase font-mono-utility">Booking Context</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted block">Booking Ref</span>
                <strong className="text-ink text-sm">#{booking.short_code}</strong>
              </div>
              <div>
                <span className="text-muted block">Status</span>
                <Badge tone={booking.status === 'completed' ? 'success' : 'accent'} className="mt-0.5">
                  {booking.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="text-muted block">Scheduled Date</span>
                <strong className="text-ink">{new Date(booking.scheduled_at).toLocaleDateString('en-GB')}</strong>
              </div>
              {provider && (
                <div>
                  <span className="text-muted block">Provider / Pro</span>
                  <strong className="text-ink">{provider.full_name}</strong>
                </div>
              )}
              <div>
                <span className="text-muted block">Booking Value</span>
                <strong className="text-ink">{pence(booking.total_pence)}</strong>
              </div>
              {booking.address && (
                <div className="md:col-span-2">
                  <span className="text-muted block">Address</span>
                  <strong className="text-ink leading-relaxed">
                    {booking.address.line1}, {booking.address.city}, {booking.address.postcode}
                  </strong>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* System Timeline / Audit Trail */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted uppercase font-mono-utility">System Audit Timeline</h3>
          <div className="relative border-l border-hairline ml-3 pl-6 space-y-6">
            {timeline.length === 0 ? (
              <p className="text-xs text-muted ml-1">No timeline logs found.</p>
            ) : (
              timeline.map((ev) => (
                <div key={ev.id} className="relative">
                  {/* Timeline bullet dot */}
                  <span className="absolute -left-[31px] top-0.5 bg-white border border-hairline rounded-full p-1 text-muted">
                    {ev.action.includes('refund') ? (
                      <DollarSign className="h-3 w-3 text-success" />
                    ) : ev.action.includes('penalty') ? (
                      <AlertOctagon className="h-3 w-3 text-danger" />
                    ) : ev.action.includes('note') ? (
                      <MessageSquare className="h-3 w-3 text-accent" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                  </span>
                  <div>
                    <span className="text-[10px] text-muted font-mono-utility block">
                      {new Date(ev.timestamp).toLocaleString('en-GB')}
                    </span>
                    <span className="text-xs font-semibold text-ink mt-0.5 block capitalize">
                      {ev.description}
                    </span>
                    {ev.metadata?.note ? (
                      <p className="text-xs text-ink italic leading-relaxed mt-1 bg-white border border-hairline p-2 rounded-xl">
                        "{ev.metadata.note}"
                      </p>
                    ) : null}
                    <span className="text-[10px] text-muted mt-1 block">By: {ev.actor}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Pane: Actions and Resolution */}
      <aside className="w-full lg:w-80 shrink-0 bg-white border-l border-hairline p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <h2 className="font-display font-bold text-md text-ink">Resolution Actions</h2>

          {error && <p className="text-xs text-danger font-semibold bg-danger/10 p-2.5 rounded-xl">{error}</p>}
          {success && <p className="text-xs text-success font-semibold bg-success/10 p-2.5 rounded-xl">{success}</p>}

          {/* Ticket Status dropdown */}
          <Field label="Update Ticket Status">
            <select
              value={ticketStatus}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              disabled={busy}
              className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-xs font-semibold focus:border-ink focus:outline-none"
            >
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </Field>

          {/* Issue Refund */}
          {booking && (
            <Card className="p-4 border border-hairline rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-muted uppercase font-mono-utility block">Refund Customer</span>
              <p className="text-xs text-muted">Execute a full refund of the Stripe payment and cancel the booking.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-success/35 text-success hover:bg-success/5"
                onClick={() => {
                  if (confirm(`Execute refund of the booking amount via Stripe?`)) {
                    handleAction('refund');
                  }
                }}
                disabled={busy}
              >
                Issue Refund
              </Button>
            </Card>
          )}

          {/* Penalize Pro */}
          {provider && (
            <Card className="p-4 border border-hairline rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-muted uppercase font-mono-utility block">Penalize Provider</span>
              <p className="text-xs text-muted">Register a formal penalty warning strike for the provider.</p>

              {showPenaltyForm ? (
                <div className="space-y-3 pt-2">
                  <Field label="Reason for Penalty">
                    <select
                      value={penaltyReason}
                      onChange={(e) => setPenaltyReason(e.target.value)}
                      className="tap w-full rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
                    >
                      <option>Provider No-Show</option>
                      <option>Poor Quality of Work</option>
                      <option>Late Arrival</option>
                      <option>Unprofessional Behavior</option>
                    </select>
                  </Field>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setShowPenaltyForm(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => handleAction('penalize', { reason: penaltyReason })} disabled={busy}>
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-danger/35 text-danger hover:bg-danger/5"
                  onClick={() => setShowPenaltyForm(true)}
                  disabled={busy}
                >
                  Penalize Pro
                </Button>
              )}
            </Card>
          )}
        </div>

        {/* Add Internal Notes */}
        <div className="pt-4 border-t border-hairline space-y-2 mt-4">
          <Field label="Add Internal Support Note">
            <textarea
              rows={3}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Write logs or updates..."
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-xs focus:border-ink focus:outline-none"
            />
          </Field>
          <Button
            size="block"
            disabled={busy || !internalNote.trim()}
            onClick={() => handleAction('note', { content: internalNote })}
          >
            Submit Note
          </Button>
        </div>
      </aside>
    </div>
  );
}
