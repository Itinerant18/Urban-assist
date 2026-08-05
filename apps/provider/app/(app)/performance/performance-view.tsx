import * as React from 'react';
import Link from 'next/link';
import { Card, EmptyState, RatingStars } from '@urban-assist/ui';
import { ukDate } from '@urban-assist/lib';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import type { PerformanceStats } from '../../../lib/provider-data';

/**
 * Thresholds that trigger a quality alert. Deliberately explicit about the
 * consequence — a warning that does not say what happens next is just anxiety.
 */
const ALERTS: {
  key: keyof PerformanceStats;
  below: number;
  above?: boolean;
  title: string;
  consequence: string;
}[] = [
  {
    key: 'ratingAvg',
    below: 4,
    title: 'Your rating is below 4.0',
    consequence:
      'Providers below 4.0 are ranked lower when jobs are matched, so you will see fewer offers.',
  },
  {
    key: 'cancellationRate',
    below: 0.15,
    above: true,
    title: 'Your cancellation rate is above 15%',
    consequence:
      'Frequent cancellations reduce how often you are offered work and may pause your account.',
  },
  {
    key: 'acceptanceRate',
    below: 0.5,
    title: 'Your acceptance rate is below 50%',
    consequence:
      'Acceptance rate is 20% of your matching score — declining often pushes you down the list.',
  },
];

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

export function PerformanceView({
  stats,
  reviews,
  training,
}: {
  stats: PerformanceStats;
  reviews: any[];
  training?: {
    mandatoryCompleted: number;
    mandatoryTotal: number;
    completionLabel: string;
    gatedIncomplete: number;
  } | null;
}) {
  const alerts = ALERTS.filter((a) => {
    const value = stats[a.key] as number | null;
    if (value === null || value === undefined) return false;
    return a.above ? value > a.below : value < a.below;
  });

  return (
    <div className="space-y-5 py-2">
      <header>
        <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
          Performance
        </h1>
        <p className="text-xs text-muted mt-0.5">
          {stats.totalCompleted} completed {stats.totalCompleted === 1 ? 'job' : 'jobs'}
        </p>
      </header>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.key} className="!p-4 border-danger/40 bg-danger/5">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">{a.title}</p>
                  <p className="text-xs text-charcoal">{a.consequence}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {training && training.mandatoryTotal > 0 && (
        <Card className="!p-4 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
                Training
              </p>
              <p className="text-sm font-semibold text-ink">{training.completionLabel}</p>
              {training.gatedIncomplete > 0 ? (
                <p className="text-xs text-muted">
                  {training.gatedIncomplete} categor
                  {training.gatedIncomplete === 1 ? 'y needs' : 'ies need'} gating modules before
                  full eligibility.
                </p>
              ) : (
                <p className="text-xs text-muted">Required modules for your services.</p>
              )}
            </div>
            <Link href="/training" className="tap text-xs font-semibold text-accent-deep underline">
              Open
            </Link>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-success"
              style={{
                width: `${
                  training.mandatoryTotal === 0
                    ? 0
                    : (training.mandatoryCompleted / training.mandatoryTotal) * 100
                }%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Headline rating */}
      <Card className="!p-5 bg-white flex items-center justify-between">
        <div>
          <p className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
            Average rating
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display text-3xl font-extrabold text-ink">
              {stats.ratingCount > 0 ? stats.ratingAvg.toFixed(1) : '—'}
            </span>
            {stats.ratingCount > 0 && <RatingStars value={stats.ratingAvg} />}
          </div>
          <p className="text-xs text-muted mt-1">
            {stats.ratingCount} {stats.ratingCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Acceptance rate"
          value={pct(stats.acceptanceRate)}
          hint="Offers you accepted"
        />
        <Metric
          label="Completion rate"
          value={pct(stats.completionRate)}
          hint="Finished vs cancelled"
        />
        <Metric
          label="Cancellation rate"
          value={pct(stats.cancellationRate)}
          hint="Lower is better"
          tone={
            stats.cancellationRate !== null && stats.cancellationRate > 0.15 ? 'bad' : 'neutral'
          }
        />
        <Metric
          label="On-time arrival"
          value={pct(stats.onTimeRate)}
          hint={
            stats.onTimeSample === 0
              ? 'No arrival times recorded yet'
              : `Across ${stats.onTimeSample} ${stats.onTimeSample === 1 ? 'job' : 'jobs'}`
          }
        />
        <Metric
          label="Repeat customers"
          value={String(stats.repeatCustomers)}
          hint="Booked you more than once"
        />
        <Metric
          label="Jobs completed"
          value={String(stats.totalCompleted)}
          hint="All time"
        />
      </div>

      {/* Upskilling: derived from the weakest metric rather than a separate system. */}
      <UpskillingCard stats={stats} />

      <section className="space-y-3">
        <h2 className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
          Reviews from customers
        </h2>
        {reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Customers can review you once a job is complete."
          />
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id}>
                <Card className="!p-4 bg-white space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RatingStars value={r.rating} />
                      <span className="text-sm text-ink">
                        {r.author?.full_name ?? 'Customer'}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted font-mono-utility">
                      {ukDate(r.created_at)}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-charcoal whitespace-pre-wrap">{r.comment}</p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'bad';
}) {
  return (
    <Card className="!p-4 bg-white flex flex-col gap-0.5">
      <span className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <span
        className={`font-display text-2xl font-extrabold ${
          value === '—' ? 'text-muted' : tone === 'bad' ? 'text-danger' : 'text-ink'
        }`}
      >
        {value}
      </span>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </Card>
  );
}

function UpskillingCard({ stats }: { stats: PerformanceStats }) {
  const suggestion =
    stats.ratingCount > 0 && stats.ratingAvg < 4.5
      ? 'Customer service and communication'
      : stats.cancellationRate !== null && stats.cancellationRate > 0.1
        ? 'Managing your schedule and availability'
        : stats.onTimeRate !== null && stats.onTimeRate < 0.9
          ? 'Route planning and punctuality'
          : null;

  if (!suggestion) return null;

  return (
    <Card className="!p-4 bg-white border-accent/30">
      <div className="flex gap-3">
        <TrendingUp className="h-5 w-5 shrink-0 text-accent" />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-ink">Suggested training</p>
          <p className="text-xs text-charcoal">
            Based on your recent metrics, <strong>{suggestion}</strong> would help most.
          </p>
          <Link href="/training" className="tap inline-block text-xs text-accent-deep underline">
            Browse training
          </Link>
        </div>
      </div>
    </Card>
  );
}
