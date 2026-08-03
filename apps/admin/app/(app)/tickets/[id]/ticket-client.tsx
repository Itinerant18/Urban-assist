'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, Field } from '@urban-assist/ui';
import { Clock, DollarSign, MessageSquare, AlertOctagon, Wallet } from 'lucide-react';
import { pence } from '@urban-assist/lib';
import {
  REFUND_REASON_PRESETS,
  TICKET_NOTE_MACROS,
} from '../../../../lib/admin-ticket-macros';

interface Ticket {
  id: string;
  booking_id: string | null;
  raised_by: string;
  category: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  created_at: string;
  assigned_to?: string | null;
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

interface PaymentSummary {
  amount_pence: number;
  status: string;
  method: string;
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
  payment,
  timeline,
  staffOptions,
}: {
  ticket: Ticket;
  booking: Booking | null;
  provider: any | null;
  payment: PaymentSummary | null;
  timeline: TimelineEvent[];
  staffOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [ticketStatus, setTicketStatus] = React.useState(ticket.status);
  const [assignedTo, setAssignedTo] = React.useState<string>(ticket.assigned_to ?? '');
  const [internalNote, setInternalNote] = React.useState('');
  const [penaltyReason, setPenaltyReason] = React.useState('No-show / Dispute resolution');
  const [showPenaltyForm, setShowPenaltyForm] = React.useState(false);
  const [showRefundForm, setShowRefundForm] = React.useState(false);
  const [showCreditForm, setShowCreditForm] = React.useState(false);
  const [refundMode, setRefundMode] = React.useState<'full' | 'half' | 'custom'>('full');
  const [customPounds, setCustomPounds] = React.useState('');
  const [refundReason, setRefundReason] = React.useState<string>(REFUND_REASON_PRESETS[0]);
  const [cancelOnRefund, setCancelOnRefund] = React.useState(true);
  const [creditPounds, setCreditPounds] = React.useState('10');
  const [creditReason, setCreditReason] = React.useState('Goodwill credit');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const maxRefundPence =
    payment && payment.method === 'card' && payment.status !== 'refunded'
      ? payment.amount_pence
      : 0;
  const canRefund = maxRefundPence > 0 && booking != null;

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

  const handleAssign = async (nextAssignee: string) => {
    const previous = assignedTo;
    setAssignedTo(nextAssignee);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assigned_to: nextAssignee || null }),
      });
      if (!res.ok) throw new Error('Failed to update assignee');
      setSuccess(nextAssignee ? 'Ticket assigned.' : 'Ticket unassigned.');
      router.refresh();
    } catch (e: any) {
      setAssignedTo(previous);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (
    action: 'refund' | 'penalize' | 'note' | 'credit',
    payload?: Record<string, unknown>,
  ) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed to execute ${action}`);
      }
      if (action === 'refund' && typeof data.amount_pence === 'number') {
        setSuccess(`Refund of ${pence(data.amount_pence)} recorded.`);
      } else {
        setSuccess(`${action.toUpperCase()} action successfully recorded!`);
      }
      if (action === 'note') setInternalNote('');
      if (action === 'penalize') setShowPenaltyForm(false);
      if (action === 'refund') setShowRefundForm(false);
      if (action === 'credit') setShowCreditForm(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const applyMacro = (body: string) => {
    setInternalNote((prev) => (prev.trim() ? `${prev.trim()}\n\n${body}` : body));
  };

  const resolveRefundAmountPence = (): number | null => {
    if (refundMode === 'full') return null;
    if (refundMode === 'half') return Math.round(maxRefundPence / 2);
    const pounds = Number(customPounds);
    if (!Number.isFinite(pounds) || pounds <= 0) return -1;
    return Math.round(pounds * 100);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
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

        <Card className="p-4 border border-hairline bg-white rounded-2xl space-y-2">
          <h2 className="text-xs font-bold text-muted uppercase font-mono-utility">Customer Issue Category: {ticket.category}</h2>
          <p className="text-sm font-medium text-ink leading-relaxed font-sans mt-2">"{ticket.description}"</p>
        </Card>

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
              {payment && (
                <div>
                  <span className="text-muted block">Payment</span>
                  <strong className="text-ink">
                    {pence(payment.amount_pence)} · {payment.method} · {payment.status}
                  </strong>
                </div>
              )}
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

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted uppercase font-mono-utility">System Audit Timeline</h3>
          <div className="relative border-l border-hairline ml-3 pl-6 space-y-6">
            {timeline.length === 0 ? (
              <p className="text-xs text-muted ml-1">No timeline logs found.</p>
            ) : (
              timeline.map((ev) => (
                <div key={ev.id} className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-white border border-hairline rounded-full p-1 text-muted">
                    {ev.action.includes('refund') ? (
                      <DollarSign className="h-3 w-3 text-success" />
                    ) : ev.action.includes('credit') || ev.action.includes('WALLET') ? (
                      <Wallet className="h-3 w-3 text-accent" />
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
                    {typeof ev.metadata?.amount_pence === 'number' && (
                      <p className="text-xs text-muted mt-1">
                        {pence(ev.metadata.amount_pence)}
                        {ev.metadata.reason ? ` · ${ev.metadata.reason}` : ''}
                      </p>
                    )}
                    <span className="text-[10px] text-muted mt-1 block">By: {ev.actor}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <aside className="w-full lg:w-80 shrink-0 bg-white border-l border-hairline p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <h2 className="font-display font-bold text-md text-ink">Resolution Actions</h2>

          {error && <p className="text-xs text-danger font-semibold bg-danger/10 p-2.5 rounded-xl">{error}</p>}
          {success && <p className="text-xs text-success font-semibold bg-success/10 p-2.5 rounded-xl">{success}</p>}

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

          <Field label="Assigned To">
            <select
              value={assignedTo}
              onChange={(e) => handleAssign(e.target.value)}
              disabled={busy}
              className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-xs font-semibold focus:border-ink focus:outline-none"
            >
              <option value="">Unassigned</option>
              {staffOptions.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </Field>

          {booking && (
            <Card className="p-4 border border-hairline rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-muted uppercase font-mono-utility block">Refund Customer</span>
              {!canRefund ? (
                <p className="text-xs text-muted">
                  {payment?.status === 'refunded'
                    ? 'Payment already fully refunded.'
                    : payment?.method === 'cash'
                      ? 'Cash booking — issue wallet credit instead.'
                      : 'No card payment available to refund.'}
                </p>
              ) : showRefundForm ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted">Up to {pence(maxRefundPence)} (Stripe may reduce if prior partials exist).</p>
                  <Field label="Amount">
                    <select
                      value={refundMode}
                      onChange={(e) => {
                        const mode = e.target.value as 'full' | 'half' | 'custom';
                        setRefundMode(mode);
                        setCancelOnRefund(mode === 'full');
                      }}
                      className="tap w-full rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
                    >
                      <option value="full">Full remaining</option>
                      <option value="half">50% ({pence(Math.round(maxRefundPence / 2))})</option>
                      <option value="custom">Custom £</option>
                    </select>
                  </Field>
                  {refundMode === 'custom' && (
                    <Field label="Custom amount (£)">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={customPounds}
                        onChange={(e) => setCustomPounds(e.target.value)}
                        className="tap w-full rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
                      />
                    </Field>
                  )}
                  <Field label="Reason">
                    <select
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="tap w-full rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
                    >
                      {REFUND_REASON_PRESETS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={cancelOnRefund}
                      onChange={(e) => setCancelOnRefund(e.target.checked)}
                    />
                    Cancel booking after refund
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setShowRefundForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => {
                        const amount_pence = resolveRefundAmountPence();
                        if (amount_pence === -1) {
                          setError('Enter a valid custom refund amount');
                          return;
                        }
                        const label =
                          amount_pence == null ? `full (${pence(maxRefundPence)})` : pence(amount_pence);
                        if (!confirm(`Issue Stripe refund of ${label}?`)) return;
                        handleAction('refund', {
                          amount_pence: amount_pence ?? undefined,
                          reason: refundReason,
                          cancel_booking: cancelOnRefund,
                        });
                      }}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted">Full or partial Stripe refund with reason and audit trail.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-success/35 text-success hover:bg-success/5"
                    onClick={() => setShowRefundForm(true)}
                    disabled={busy}
                  >
                    Issue Refund
                  </Button>
                </>
              )}
            </Card>
          )}

          <Card className="p-4 border border-hairline rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-muted uppercase font-mono-utility block">Wallet Credit</span>
            {showCreditForm ? (
              <div className="space-y-3 pt-1">
                <Field label="Amount (£)">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={creditPounds}
                    onChange={(e) => setCreditPounds(e.target.value)}
                    className="tap w-full rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
                  />
                </Field>
                <Field label="Reason">
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    className="tap w-full rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => setShowCreditForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => {
                      const pounds = Number(creditPounds);
                      if (!Number.isFinite(pounds) || pounds <= 0) {
                        setError('Enter a valid credit amount');
                        return;
                      }
                      handleAction('credit', {
                        amount_pence: Math.round(pounds * 100),
                        reason: creditReason.trim() || 'Goodwill credit',
                      });
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted">Goodwill credit to the customer wallet (no Stripe refund).</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowCreditForm(true)}
                  disabled={busy}
                >
                  Grant Credit
                </Button>
              </>
            )}
          </Card>

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

        <div className="pt-4 border-t border-hairline space-y-2 mt-4">
          <Field label="Add Internal Support Note">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {TICKET_NOTE_MACROS.map((macro) => (
                <button
                  key={macro.id}
                  type="button"
                  disabled={busy}
                  onClick={() => applyMacro(macro.body)}
                  className="rounded-lg border border-hairline bg-bg/40 px-2 py-1 text-[10px] font-semibold text-ink hover:bg-hairline/40 disabled:opacity-50"
                >
                  {macro.label}
                </button>
              ))}
            </div>
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
