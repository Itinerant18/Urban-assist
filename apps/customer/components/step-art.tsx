'use client';

import { useState } from 'react';

// Illustration slot for how-it-works steps. Drop `public/images/steps/step-N.webp`
// and it appears; until then the tinted square (with the step number) stands.
export function StepArt({ index, className }: { index: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  // Mount probe: the 404 can fire before hydration, when React's onError is
  // not attached yet — a complete image with zero natural size means failed.
  const probe = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  };
  if (failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`/images/steps/step-${index}.webp`}
      alt=""
      loading="lazy"
      ref={probe}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
