'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, Badge } from '@urban-assist/ui';
import { pence, ukDate, ukDateTime } from '@urban-assist/lib';
import { ArrowLeft, Printer } from 'lucide-react';
import { splitCommission } from '../../../../../lib/provider-data';

export function InvoiceView({
  booking,
  payment,
  commissionBps,
}: {
  booking: any;
  payment: any;
  commissionBps: number;
}) {
  const net = booking.price_pence ?? 0;
  const vat = booking.vat_pence ?? 0;
  const gross = booking.total_pence ?? net + vat;
  const wallet = booking.wallet_applied_pence ?? 0;

  // Commission is charged on the job price, matching claim_booking_payout() which
  // computes price_pence − round(price_pence × bps / 10000). Deriving it the same way
  // here keeps this statement consistent with what actually gets paid out.
  const { commission, net: takeHome } = splitCommission(net, commissionBps);

  const paid =
    payment?.status === 'succeeded' ||
    (payment?.method === 'cash' && !!payment?.cash_collected_at);

  return (
    <div className="space-y-4 py-2 printable-container">
      <div className="flex items-center justify-between no-print">
        <Link
          href={`/jobs/${booking.id}`}
          className="tap inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to job
        </Link>
        <button
          onClick={() => window.print()}
          className="tap inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <Card className="!p-6 bg-white space-y-6">
        <header className="flex items-start justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Job statement</h1>
            <p className="font-mono-utility text-xs text-muted mt-1">#{booking.short_code}</p>
          </div>
          <Badge tone={paid ? 'success' : 'muted'}>{paid ? 'Paid' : 'Awaiting payment'}</Badge>
        </header>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Customer
            </dt>
            <dd className="text-ink mt-0.5">{booking.customer?.full_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Service
            </dt>
            <dd className="text-ink mt-0.5">
              {booking.sku?.name ?? booking.category?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Scheduled
            </dt>
            <dd className="text-ink mt-0.5">{ukDateTime(booking.scheduled_at)}</dd>
          </div>
          <div>
            <dt className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Completed
            </dt>
            <dd className="text-ink mt-0.5">
              {booking.completed_at ? ukDate(booking.completed_at) : 'Not yet'}
            </dd>
          </div>
          {booking.sku?.duration_mins && (
            <div>
              <dt className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
                Estimated duration
              </dt>
              <dd className="text-ink mt-0.5">{booking.sku.duration_mins} mins</dd>
            </div>
          )}
          <div className="col-span-2">
            <dt className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Address
            </dt>
            <dd className="text-ink mt-0.5">
              {[booking.address?.line1, booking.address?.line2, booking.address?.city, booking.address?.postcode]
                .filter(Boolean)
                .join(', ') || '—'}
            </dd>
          </div>
        </dl>

        {/* What the customer was charged */}
        <section className="space-y-2">
          <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
            Customer charge
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Service" value={pence(net)} />
            <Row label="VAT" value={pence(vat)} />
            {wallet > 0 && <Row label="Wallet credit applied" value={`−${pence(wallet)}`} muted />}
            <Row
              label="Total"
              value={pence(Math.max(0, gross - wallet))}
              strong
              border
            />
          </dl>
          <p className="text-[10px] text-muted">
            Paid by {booking.payment_method === 'cash' ? 'cash' : 'card'}
            {payment?.cash_collected_at && ` · collected ${ukDate(payment.cash_collected_at)}`}
          </p>
        </section>

        {/* What the provider receives */}
        <section className="space-y-2">
          <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
            Your earnings
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row label="Job price (excl. VAT)" value={pence(net)} />
            <Row
              label={`Platform commission${commissionBps > 0 ? ` (${(commissionBps / 100).toFixed(1)}%)` : ''}`}
              value={`−${pence(commission)}`}
            />
            <Row label="You receive" value={pence(takeHome)} strong border />
          </dl>
          <p className="text-[10px] text-muted">
            VAT is collected on the platform&apos;s behalf and is not part of your earnings.
          </p>
        </section>

        {booking.notes && (
          <section className="space-y-1">
            <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Customer notes
            </h2>
            <p className="text-sm text-charcoal whitespace-pre-wrap">{booking.notes}</p>
          </section>
        )}

        {booking.completion_report && (
          <section className="space-y-1">
            <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
              Completion report
            </h2>
            <p className="text-sm text-charcoal whitespace-pre-wrap">
              {typeof booking.completion_report === 'string'
                ? booking.completion_report
                : booking.completion_report?.notes ?? ''}
            </p>
          </section>
        )}
      </Card>

      {booking.status !== 'completed' && (
        <p className="text-xs text-muted no-print">
          This job is not complete yet, so these figures are an estimate.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  border,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  border?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${border ? 'border-t border-hairline pt-1.5' : ''}`}
    >
      <dt className={strong ? 'font-semibold text-ink' : muted ? 'text-muted' : 'text-muted'}>
        {label}
      </dt>
      <dd
        className={
          strong ? 'font-display font-bold text-success' : 'font-mono-utility text-ink'
        }
      >
        {value}
      </dd>
    </div>
  );
}
