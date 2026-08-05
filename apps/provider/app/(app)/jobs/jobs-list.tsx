'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, Badge, EmptyState } from '@urban-assist/ui';
import { pence, ukDate, ukDateTime } from '@urban-assist/lib';
import { MapPin, ChevronRight, ShieldCheck } from 'lucide-react';
import { JOB_FILTERS, type JobFilter } from '../../../lib/provider-data';
// One status vocabulary across customer, provider and admin — `assigned` used to
// read "Upcoming/muted" here and "Scheduled/accent" to the customer.
import { bookingStatusLabel, bookingStatusTone } from '@urban-assist/domain/job-status';

const TABS: { value: JobFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

/**
 * Boundary of a local calendar day from a `YYYY-MM-DD` date input.
 *
 * Built from parts rather than `new Date(str)`: the string form is specified to parse
 * as UTC midnight, so applying local hours to it lands on the previous day anywhere
 * west of Greenwich. Harmless in the UK, wrong everywhere else.
 */
function localDay(value: string, edge: 'start' | 'end') {
  const [y, m, d] = value.split('-').map(Number);
  return edge === 'start'
    ? new Date(y, m - 1, d, 0, 0, 0, 0)
    : new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function JobsList({ jobs }: { jobs: any[] }) {
  const [tab, setTab] = React.useState<JobFilter>('active');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: jobs.length };
    for (const [key, statuses] of Object.entries(JOB_FILTERS)) {
      c[key] = jobs.filter((j) => (statuses as readonly string[]).includes(j.status)).length;
    }
    return c;
  }, [jobs]);

  const shown = React.useMemo(() => {
    let list =
      tab === 'all'
        ? jobs
        : jobs.filter((j) => (JOB_FILTERS[tab] as readonly string[]).includes(j.status));

    // Date inputs are local calendar days; widen `to` to the end of that day so a
    // single-day filter (from === to) matches jobs scheduled during it.
    if (from) {
      list = list.filter((j) => new Date(j.scheduled_at) >= localDay(from, 'start'));
    }
    if (to) {
      list = list.filter((j) => new Date(j.scheduled_at) <= localDay(to, 'end'));
    }
    return list;
  }, [jobs, tab, from, to]);

  const shownValue = shown
    .filter((j) => j.status === 'completed')
    .reduce((s, j) => s + (j.total_pence ?? 0), 0);

  return (
    <div className="space-y-4 py-2">
      <header className="space-y-3">
        <div>
          <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
            My Jobs
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {shown.length} {shown.length === 1 ? 'job' : 'jobs'}
            {shownValue > 0 && ` · ${pence(shownValue)} earned`}
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter jobs">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={`tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tab === t.value
                  ? 'border-ink bg-ink text-bg'
                  : 'border-hairline bg-white text-muted hover:border-ink hover:text-ink'
              }`}
            >
              {t.label} ({counts[t.value] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
              From
            </span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="tap rounded-xl border border-input-border bg-white px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
              To
            </span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="tap rounded-xl border border-input-border bg-white px-3 py-2 text-sm text-ink"
            />
          </label>
          {(from || to) && (
            <button
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="tap pb-2 text-xs text-muted underline hover:text-ink"
            >
              Clear dates
            </button>
          )}
        </div>
      </header>

      {shown.length === 0 ? (
        <EmptyState
          title="No jobs here"
          description={
            from || to
              ? 'Nothing in that date range. Try widening it.'
              : tab === 'active'
                ? 'Accepted jobs will appear here until they are complete.'
                : 'Nothing to show for this filter yet.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((j) => (
            <li key={j.id}>
              <Link
                href={`/jobs/${j.id}`}
                className="tap block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <Card className="!p-4 bg-white transition hover:border-ink">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-ink">
                          {j.category?.name ?? 'Job'}
                        </span>
                        <Badge tone={bookingStatusTone(j.status)}>
                          {bookingStatusLabel(j.status)}
                        </Badge>
                        {j.admin_assigned && (
                          <Badge tone="muted">
                            <ShieldCheck className="h-3 w-3" />
                            Assigned by Urban Assist
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted">{ukDateTime(j.scheduled_at)}</p>

                      <p className="text-xs text-muted flex items-center gap-1 min-w-0">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[j.address?.line1, j.address?.postcode].filter(Boolean).join(', ') || '—'}
                        </span>
                      </p>

                      {j.status === 'cancelled' && j.cancellation_reason && (
                        <p className="text-xs text-danger">Reason: {j.cancellation_reason}</p>
                      )}
                      {j.status === 'completed' && j.completed_at && (
                        <p className="text-[11px] text-muted font-mono-utility">
                          Completed {ukDate(j.completed_at)} · #{j.short_code}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div
                        className={`font-display text-lg font-bold ${
                          j.status === 'completed' ? 'text-success' : 'text-ink'
                        }`}
                      >
                        {pence(j.total_pence ?? 0)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted ml-auto" />
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
