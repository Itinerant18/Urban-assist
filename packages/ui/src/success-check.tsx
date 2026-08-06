// SuccessCheck — CSS-only stroke-draw of a check inside a circle.
// CSS-only so the booking-success page STAYS a server component; the
// prefers-reduced-motion blanket collapses the animation to its final state,
// rendering an instant static check.
import * as React from 'react';
import { cn } from './cn';

interface SuccessCheckProps {
  className?: string;
  /** Diameter in px. */
  size?: number;
}

export function SuccessCheck({ className, size = 80 }: SuccessCheckProps) {
  return (
    <div
      className={cn('relative grid place-items-center rounded-full bg-success/10 border border-success/20', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size * 0.52} height={size * 0.52} fill="none">
        {/* pathLength normalises both paths to 100 so the dash offset is 100→0
            regardless of path geometry. */}
        <circle
          pathLength={100}
          cx="50"
          cy="50"
          r="45"
          stroke="rgb(var(--success))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset="100"
          className="animate-draw-circle"
        />
        <path
          pathLength={100}
          d="M32 52 L45 65 L70 38"
          stroke="rgb(var(--success))"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="100"
          strokeDashoffset="100"
          className="animate-draw-check"
        />
      </svg>
    </div>
  );
}
