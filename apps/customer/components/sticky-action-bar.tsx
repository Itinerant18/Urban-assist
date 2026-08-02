'use client';

import * as React from 'react';
import { cn } from '@urban-assist/ui';

/**
 * Shared mobile sticky action bar — Book / Confirm / Pay / Rate.
 * Safe-area aware; hidden on lg+ (desktop uses inline CTAs).
 */
export function StickyActionBar({
  children,
  className,
  zClassName = 'z-40',
  maxWidthClassName = 'max-w-lg',
  /** Override bottom position (e.g. sit above tab bar). */
  bottomClassName = 'bottom-0',
  /** When false, skip safe-area padding (use when bar sits above a tab that already pads). */
  safeArea = true,
}: {
  children: React.ReactNode;
  className?: string;
  zClassName?: string;
  maxWidthClassName?: string;
  bottomClassName?: string;
  safeArea?: boolean;
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 border-t border-hairline bg-white/95 px-4 py-3 backdrop-blur lg:hidden',
        safeArea ? 'pb-[max(12px,env(safe-area-inset-bottom))]' : 'pb-3',
        bottomClassName,
        zClassName,
        className,
      )}
    >
      <div className={cn('mx-auto flex w-full items-center gap-3', maxWidthClassName)}>
        {children}
      </div>
    </div>
  );
}

/** Left cluster: small label + bold value (price / total). */
export function StickyActionMeta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="truncate text-lg font-extrabold leading-tight text-ink">{value}</div>
    </div>
  );
}
