/**
 * The one price breakdown. Booking aside, mobile price sheet and the invoice all
 * render this, so a customer never sees the total explained two different ways.
 *
 * VAT copy is derived from VAT_RATE — the "(20%)" strings used to be typed by hand
 * in four places, which is one Budget away from being a lie.
 */
import * as React from 'react';
import { pence, VAT_RATE } from '@urban-assist/utils';
import { cn } from './cn';

export const vatLabel = `VAT (${(VAT_RATE * 100).toFixed(VAT_RATE * 100 % 1 === 0 ? 0 : 1)}%)`;

export interface PriceSummaryProps {
  /** What was bought — the service title. */
  itemLabel: string;
  netPence: number;
  vatPence: number;
  totalPence: number;
  discountPence?: number;
  /** e.g. wallet credit applied. Shown as its own deduction row. */
  extraLines?: { label: string; pence: number; negative?: boolean }[];
  className?: string;
}

export function PriceSummary({
  itemLabel,
  netPence,
  vatPence,
  totalPence,
  discountPence = 0,
  extraLines,
  className,
}: PriceSummaryProps) {
  return (
    <div className={cn('space-y-2.5 text-sm', className)}>
      <Row label={itemLabel} value={pence(netPence)} />
      {discountPence > 0 && (
        <Row label="Discount" value={`−${pence(discountPence)}`} tone="credit" />
      )}
      {extraLines?.map((l) => (
        <Row
          key={l.label}
          label={l.label}
          value={`${l.negative ? '−' : ''}${pence(l.pence)}`}
          tone={l.negative ? 'credit' : undefined}
        />
      ))}
      <Row label={vatLabel} value={pence(vatPence)} />
      <div className="flex items-baseline justify-between border-t border-hairline pt-3">
        <span className="text-base font-bold text-ink">Total</span>
        <span className="font-display text-2xl font-extrabold text-ink">{pence(totalPence)}</span>
      </div>
      <p className="text-right text-[11px] text-muted">VAT included · GBP</p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'credit';
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={cn('text-muted', tone === 'credit' && 'text-success-deep')}>{label}</span>
      <span
        className={cn(
          'shrink-0 font-medium text-ink',
          tone === 'credit' && 'text-success-deep',
        )}
      >
        {value}
      </span>
    </div>
  );
}
