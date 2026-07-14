'use client';
// The single signature element of the product (§5).
// A thin amber line with a travelling dot through the booking lifecycle.
// Respects prefers-reduced-motion: no motion, just a static progress bar.

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from './cn';

export type TrackStage =
  | 'finding'
  | 'matched'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed';

const ORDER: TrackStage[] = [
  'finding',
  'matched',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
];

const LABELS: Record<TrackStage, string> = {
  finding: 'Finding',
  matched: 'Provider Matched',
  on_the_way: 'On the way',
  arrived: 'Arrived at Location',
  in_progress: 'Service in Progress',
  completed: 'Completed',
};

export function LiveStatusTrack({
  stage,
  className,
  orientation = 'horizontal',
}: {
  stage: TrackStage;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  const reduce = useReducedMotion();
  const idx = ORDER.indexOf(stage);
  const pct = (idx / (ORDER.length - 1)) * 100;

  if (orientation === 'vertical') {
    return (
      <div className={cn('select-none pl-2', className)} role="status" aria-label={`Status: ${LABELS[stage]}`}>
        <div className="relative border-l-2 border-hairline ml-2 space-y-8 py-4">
          {/* filled portion */}
          <div
            className="absolute top-0 bottom-0 left-[-2px] border-l-2 border-accent transition-all duration-700"
            style={{ height: `${pct}%` }}
          />
          {ORDER.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s} className="relative flex items-center pl-6">
                <div
                  className={cn(
                    'absolute -left-2 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full border-2',
                    done
                      ? 'border-accent bg-accent text-ink'
                      : active
                      ? 'border-accent bg-bg'
                      : 'border-hairline bg-bg'
                  )}
                >
                  {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </div>
                <div className={cn("text-sm transition-colors", i <= idx ? "font-bold text-ink" : "text-muted")}>
                  {LABELS[s]}
                  {active && s === 'finding' && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={cn('select-none', className)} role="status" aria-label={`Status: ${LABELS[stage]}`}>
      <div className="relative h-1.5 rounded-full bg-hairline">
        {/* filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        {/* nodes */}
        {ORDER.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div
              key={s}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(i / (ORDER.length - 1)) * 100}%` }}
            >
              <div
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border-2',
                  done
                    ? 'border-accent bg-accent text-ink'
                    : active
                    ? 'border-accent bg-bg'
                    : 'border-hairline bg-bg',
                )}
              >
                {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </div>
            </div>
          );
        })}
        {/* travelling dot */}
        {!reduce && idx < ORDER.length - 1 && (
          <motion.div
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${pct}%` }}
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="block h-2 w-2 rounded-full bg-accent shadow-[0_0_0_4px_rgb(var(--accent)/0.25)]" />
          </motion.div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1 text-[10px] text-muted">
        {ORDER.map((s, i) => (
          <span
            key={s}
            className={cn(
              'text-center font-mono-utility',
              i <= idx && 'text-ink',
            )}
          >
            {LABELS[s]}
          </span>
        ))}
      </div>
      {stage === 'finding' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Finding your provider…
        </div>
      )}
    </div>
  );
}

/**
 * Map a `bookings.status` value to a `TrackStage` for display.
 */
export function statusToStage(status: string): TrackStage {
  switch (status) {
    case 'pending_match':
      return 'finding';
    case 'assigned':
      return 'matched';
    case 'on_the_way':
      return 'on_the_way';
    case 'arrived':
      return 'arrived';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    default:
      return 'finding';
  }
}
