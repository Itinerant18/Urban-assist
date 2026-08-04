'use client';
import * as React from 'react';

// Drop-a-file image convention: put `<category-slug>.svg` in the app's
// public/images/services/ and it renders automatically; anything missing
// falls back to the stripe placeholder, so images can be added incrementally
// with zero code. Canonical source folder lives in apps/customer; run
// `pnpm sync:images` to fan out to provider/admin.
const STRIPES: Record<'A' | 'B', string> = {
  A: 'repeating-linear-gradient(135deg, #EDE6D8, #EDE6D8 10px, #E4DBC9 10px, #E4DBC9 20px)',
  B: 'repeating-linear-gradient(135deg, #E9F0E9, #E9F0E9 10px, #DEE9DE 10px, #DEE9DE 20px)',
};

export function ServiceImage({
  slug,
  caption,
  stripeType = 'A',
}: {
  slug: string;
  /** Alt text and fallback label. Pass '' for small decorative thumbnails. */
  caption: string;
  stripeType?: 'A' | 'B';
}) {
  const [failed, setFailed] = React.useState(false);

  if (!slug || failed) {
    return (
      <div
        className="absolute inset-0"
        style={{ background: STRIPES[stripeType] }}
        aria-hidden="true"
      />
    );
  }

  return (
    // ponytail: plain <img> — local static SVGs gain nothing from next/image
    <img
      src={`/images/services/${slug}.svg`}
      alt={caption}
      loading="lazy"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
