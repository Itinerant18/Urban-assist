'use client';

import { usePathname } from 'next/navigation';
import { StickyBookBar } from './sticky-book-bar';
import { hasBottomTabs, ownsOwnSticky, resolveCta } from '../lib/global-mobile-cta';

/**
 * Global mobile sticky Book CTA — shown on every customer screen except
 * immersive flows that already provide their own sticky action bar.
 * Sits above the bottom tab bar when tabs are present.
 */
export function GlobalMobileCta() {
  const pathname = usePathname();

  if (ownsOwnSticky(pathname)) return null;

  const tabs = hasBottomTabs(pathname);
  const cta = resolveCta(pathname);

  return (
    <StickyBookBar
      label={cta.label}
      subtitle={cta.subtitle}
      href={cta.href}
      ctaLabel={cta.ctaLabel}
      zClassName="z-sticky"
      // --tabbar-clearance is the single source for tab-bar height (ui/globals.css)
      bottomClassName={tabs ? 'above-tabbar' : 'bottom-0'}
      safeArea={!tabs}
    />
  );
}
