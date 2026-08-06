'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { getCategoryIcon } from '../lib/services-data';

// Subcategory icon slot with a drop-a-file convention:
// drop `public/images/services/subs/<sub-slug>.webp` and every slot shows the
// art automatically. Until the file exists the app renders the current lucide
// glyph — identical to today, never a broken image. The art is preloaded
// before swapping in (instead of a mount probe) so the fallback is the SSR
// default and a missing file can never flash.
interface SubcategoryIconProps {
  /** Kebab-case subcategory slug → `/images/services/subs/<slug>.webp`. */
  subSlug?: string;
  /** Glyph name rendered until the art exists (e.g. `subcategory.icon`). */
  fallbackIcon?: string;
  /** Custom fallback (e.g. the parent-category badge) — wins over fallbackIcon. */
  fallbackNode?: ReactNode;
  imgClassName?: string;
  iconClassName?: string;
  iconStyle?: CSSProperties;
}

export function SubcategoryIcon({
  subSlug,
  fallbackIcon,
  fallbackNode,
  imgClassName,
  iconClassName,
  iconStyle,
}: SubcategoryIconProps) {
  const [artUrl, setArtUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!subSlug) return;
    let alive = true;
    const src = `/images/services/subs/${subSlug}.webp`;
    const probe = new Image();
    probe.onload = () => {
      if (alive) setArtUrl(src);
    };
    probe.src = src;
    return () => {
      alive = false;
    };
  }, [subSlug]);

  if (artUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={artUrl} alt="" draggable={false} className={imgClassName} />
    );
  }

  if (fallbackNode) return <>{fallbackNode}</>;
  const Icon = getCategoryIcon(fallbackIcon ?? '');
  return <Icon className={iconClassName} style={iconStyle} />;
}
