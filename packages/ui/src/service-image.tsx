'use client';
import * as React from 'react';
import { cn } from './cn';

// Drop-a-file image convention: put art in the app's public/images/services/
// and it renders automatically; anything missing falls back down the chain to
// the stripe placeholder, so images can be added incrementally with zero code.
// Canonical source folder lives in apps/customer; run `pnpm sync:images` to
// fan out to provider/admin.
//
// Three asset classes, Urban-Company style — one per slot, never mixed:
//   icon   (default) — square illustration in a small square slot, contain.
//   card   — 4:3 tile art (`<slug>-card`), full-bleed cover.
//   banner — wide hero art (`<slug>-banner`), full-bleed cover.
// Every name is tried as .webp first, then .svg — the AI art re-exported to
// webp is ~30× smaller than the raster-wrapped SVG originals. Card/banner
// slots fall back to the icon asset centred on a tinted tile, then stripes.
const STRIPES: Record<'A' | 'B', string> = {
  A: 'repeating-linear-gradient(135deg, #EDE6D8, #EDE6D8 10px, #E4DBC9 10px, #E4DBC9 20px)',
  B: 'repeating-linear-gradient(135deg, #E9F0E9, #E9F0E9 10px, #DEE9DE 10px, #DEE9DE 20px)',
};

type Variant = 'icon' | 'card' | 'banner';

interface Candidate {
  file: string;
  /** Icon art standing in for missing card/banner art gets the tinted-tile treatment. */
  asIconOnTile: boolean;
}

function candidatesFor(slug: string, variant: Variant): Candidate[] {
  const pair = (name: string, asIconOnTile = false) => [
    { file: `${name}.webp`, asIconOnTile },
    { file: `${name}.svg`, asIconOnTile },
  ];
  if (variant === 'banner')
    return [...pair(`${slug}-banner`), ...pair(`${slug}-card`), ...pair(slug, true)];
  if (variant === 'card') return [...pair(`${slug}-card`), ...pair(slug, true)];
  return pair(slug);
}

export function ServiceImage({
  slug,
  caption,
  stripeType = 'A',
  variant = 'icon',
  priority = false,
}: {
  slug: string;
  /** Alt text and fallback label. Pass '' for small decorative thumbnails. */
  caption: string;
  stripeType?: 'A' | 'B';
  variant?: Variant;
  /** The one above-the-fold hero per page: eager + high fetch priority. */
  priority?: boolean;
}) {
  const sources = slug ? candidatesFor(slug, variant) : [];

  // Render-time reset on prop change (NOT an effect: an effect runs after the
  // mount probe and would stomp an already-advanced index back onto a 404'd
  // source, freezing the fallback chain).
  const propKey = `${variant}:${slug}`;
  const [state, setState] = React.useState({ propKey, idx: 0 });
  if (state.propKey !== propKey) setState({ propKey, idx: 0 });
  const idx = state.idx;
  const advance = () => setState((s) => ({ ...s, idx: s.idx + 1 }));

  // The browser can fire a 404 error BEFORE React hydrates and attaches
  // onError — the broken-image icon then sticks. Catch already-failed images
  // on mount: complete with zero natural size means the load failed.
  const probe = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) advance();
  };

  if (idx >= sources.length) {
    return (
      <div
        className="absolute inset-0"
        style={{ background: STRIPES[stripeType] }}
        aria-hidden="true"
      />
    );
  }

  const src = sources[idx];
  const fullBleed = variant !== 'icon' && !src.asIconOnTile;

  return (
    // ponytail: plain <img> — pre-sized local assets gain nothing from
    // next/image, and it would break the drop-a-file convention.
    // key remounts the img per source so the probe re-runs after a fallback.
    <img
      key={src.file}
      ref={probe}
      src={`/images/services/${src.file}`}
      alt={caption}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      onError={advance}
      // ponytail: no load fade — SSR must paint images visible (no-JS/headless
      // safety), and the tinted tile behind every slot already softens pop-in.
      className={cn(
        'absolute inset-0 h-full w-full',
        fullBleed && 'object-cover',
        variant === 'icon' && 'object-contain',
        src.asIconOnTile && 'bg-surface-sunk object-contain p-4',
      )}
    />
  );
}
