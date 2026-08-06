'use client';

import { useState } from 'react';

// Avatar circle with an initials fallback when no photo is set or the URL dies.
// Calm, tinted — no stock-photo energy until real avatars exist.
const TINTS = ['bg-bg text-ink', 'bg-accent/10 text-accent-deep', 'bg-success/10 text-success-deep'];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ReviewAvatar({
  name,
  src,
  className = 'h-10 w-10 text-[12px]',
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Mount probe: a 404 can fire before hydration, when onError is unattached.
  const probe = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  };
  const showImg = src && !failed;
  const tint = TINTS[(name.charCodeAt(0) || 0) % TINTS.length];

  return (
    <span className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${tint} ${className}`}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          ref={probe}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="font-extrabold tracking-wide">{initials(name)}</span>
      )}
    </span>
  );
}
