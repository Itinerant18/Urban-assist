'use client';

import Link from 'next/link';
import { pence } from '@urban-assist/lib';
import { StickyActionBar, StickyActionMeta } from './sticky-action-bar';

/**
 * Mobile-only sticky book CTA.
 * Desktop (≥ lg) stays sidebar/inline — this bar is lg:hidden via StickyActionBar.
 */
export function StickyBookBar({
  label = 'From',
  pricePence,
  subtitle,
  href,
  ctaLabel = 'Book now',
  zClassName = 'z-40',
  bottomClassName,
  safeArea,
}: {
  label?: string;
  pricePence?: number;
  subtitle?: string;
  href: string;
  ctaLabel?: string;
  zClassName?: string;
  bottomClassName?: string;
  safeArea?: boolean;
}) {
  const value =
    typeof pricePence === 'number' && Number.isFinite(pricePence)
      ? pence(pricePence)
      : (subtitle ?? '');

  return (
    <StickyActionBar
      zClassName={zClassName}
      bottomClassName={bottomClassName}
      safeArea={safeArea}
    >
      <StickyActionMeta label={label} value={value} />
      <Link
        href={href}
        className="min-h-12 shrink-0 rounded-xl bg-accent px-8 py-3 text-center text-[14px] font-bold text-white transition hover:bg-accent-hover"
      >
        {ctaLabel}
      </Link>
    </StickyActionBar>
  );
}
