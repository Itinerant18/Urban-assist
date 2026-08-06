// BeforeAfter — drag slider over a before/after photo pair.
//
// Proven conversion pattern for transformation services (cleaning, gardening,
// painting). A transparent native <input type="range"> covers the whole
// surface, so pointer + touch + keyboard + role="slider" semantics come free;
// its value drives a CSS clip-path on the after layer. No JS motion — nothing
// to gate for reduced motion.
'use client';
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterProps {
  /** Category slug; looks for `<slug>-before.webp` / `<slug>-after.webp`. */
  slug: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

// Per-side fallback chain: `<slug>-before.webp → <slug>.webp → <slug>.svg`.
// Until a real before/after pair lands, both layers show the same art — the
// slider pattern still renders designed, not broken.
function PairImage({
  candidates,
  alt,
  className,
}: {
  candidates: string[];
  alt: string;
  className: string;
}) {
  const [idx, setIdx] = React.useState(0);
  const probe = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setIdx((i) => i + 1);
  };
  if (idx >= candidates.length) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={candidates[idx]}
      ref={probe}
      src={candidates[idx]}
      alt={alt}
      loading="lazy"
      onError={() => setIdx((i) => i + 1)}
      className={className}
    />
  );
}

export function BeforeAfter({ slug, beforeLabel = 'Before', afterLabel = 'After', className }: BeforeAfterProps) {
  const [pos, setPos] = React.useState(50);
  const base = `/images/services/${slug}`;
  const chain = [`${base}.webp`, `${base}.svg`];

  return (
    <div className={className}>
      <div className="relative aspect-[4/3] select-none overflow-hidden rounded-2xl bg-bg shadow-inner">
        {/* Before layer (full) */}
        <PairImage
          candidates={[`${base}-before.webp`, ...chain]}
          alt={`${beforeLabel} photo`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* After layer (clipped) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <PairImage
            candidates={[`${base}-after.webp`, ...chain]}
            alt={`${afterLabel} photo`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Divider + handle */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
          <div className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]" />
          <div className="absolute top-1/2 -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/95 text-ink shadow-md">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <ChevronRight className="-ml-2 h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        {/* Native range drives everything; invisible, full-surface. */}
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`Compare ${beforeLabel.toLowerCase()} and ${afterLabel.toLowerCase()}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>

      <div className="mt-2 flex items-center justify-between px-1 text-[11px] font-bold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-hairline" aria-hidden="true" /> {beforeLabel}
        </span>
        <span className="flex items-center gap-1.5">
          {afterLabel} <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
