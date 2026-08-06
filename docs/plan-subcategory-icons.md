# Implementation Plan — Subcategory Icon Art (for Codex)

## Goal

The 14 category badge icons are live everywhere, but the ~48 **subcategories** (and the service cards that inherit their icon) still render generic lucide glyphs (`getCategoryIcon(sub.icon)` → sparkle/pen). Extend the drop-a-file art convention to subcategories: a designer drops `apps/customer/public/images/services/subs/<sub-slug>.webp` and every subcategory tile/chip picks it up automatically, falling back to the current lucide glyph until the file exists. Also document the new class in `docs/design-asset-guide.md` so the designer knows what to produce.

Do NOT produce any image files. Code + docs only. No new dependencies.

## Constraints

- Fallback chain is mandatory: missing art must render the **current lucide glyph** (not a broken image, not stripes). The app must look identical to today until files land.
- SSR-safe 404 handling: a 404 can fire before hydration attaches `onError`. Use the existing mount-probe pattern (`el.complete && el.naturalWidth === 0`) — see `apps/customer/components/review-avatar.tsx` for the canonical example.
- Kebab-case filenames; the sub-slug is the source of truth.
- `pnpm sync:images` already copies recursively — a `subs/` subfolder needs no script change. Verify once.

## Step 1 — Canonical slug list

Source of truth for the static taxonomy: `apps/customer/lib/services-data.ts` (categories → subcategories with `slug` + `icon`). The DB-backed loader `apps/customer/lib/catalog.ts` mirrors it (`service_subcategories` table). Extract every subcategory slug grouped by category — you'll paste this list into the guide section (Step 3). Sanity check: ~48 subcategories across 14 categories.

## Step 2 — `SubcategoryIcon` component

New file `apps/customer/components/subcategory-icon.tsx` (client component):

```tsx
'use client';
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

// Drop-a-file: `public/images/services/subs/<slug>.webp` renders when present;
// until then the lucide glyph passed by the caller renders — pages look
// unchanged with zero art. Mount probe catches pre-hydration 404s.
export function SubcategoryIcon({
  slug,
  fallback: Fallback,
  fallbackClassName,
  imgClassName = 'h-full w-full object-contain',
}: {
  slug: string;
  fallback: LucideIcon;
  fallbackClassName?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const probe = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  };
  if (failed) return <Fallback className={fallbackClassName} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={probe} src={`/images/services/subs/${slug}.webp`} alt="" loading="lazy"
      onError={() => setFailed(true)} className={imgClassName} />
  );
}
```

Keep exactly this shape (ponytail: one state, no context, no extra props). Callers keep their existing chip `<span>` wrappers and pass their current lucide icon + classes as the fallback.

## Step 3 — Replace call sites (subcategory + service-card glyphs only)

Swap the inner `<SubIcon .../>`-style lucide render for `<SubcategoryIcon slug={sub.slug} fallback={SubIcon} fallbackClassName={…existing classes…} />` at these locations. Do NOT touch category-level icons (already badge art) or nav/utility glyphs.

1. `apps/customer/app/(dashboard)/services/[category]/page.tsx` — "Browse by type" grid (~line 96-108, `SubIcon` inside the tinted chip).
2. `apps/customer/app/(dashboard)/services/[category]/[subcategory]/subcategory-client.tsx` — every `getCategoryIcon`-derived glyph: sticky sub-header chip, hero chip, service-card chips in the services grid, related-subcategory tiles. For service cards, use the PARENT subcategory's slug (services don't get their own art class yet).
3. `apps/customer/app/(dashboard)/services/[category]/[subcategory]/[service]/page.tsx` — service hero chip (subcategory slug) . NOTE this is a server component: either keep the lucide glyph OR wrap in the client component — client component is fine to render from a server component; just import and use it.
4. `apps/customer/components/services/service-card.tsx` — the card art placeholder glyph (used by "More <subcategory>" / related grids). Needs the subcategory slug prop threaded in if not already available on the card's data; if threading is invasive, add optional `subSlug?: string` prop and pass it from the two render sites that have it.
5. `apps/customer/app/(dashboard)/services/catalog-client.tsx` — the catalog index subcategory tiles (`aspect-square` icon-in-box tiles).

SKIP `featured-services.tsx`, `mobile-home.tsx`, `category-section.tsx`, `category-tabs.tsx` — those are category-level (already covered) or list chips where a second art system adds noise. Leave them.

## Step 4 — Guide section

In `docs/design-asset-guide.md`, insert a new section **"3h. Subcategory icons — `subs/<sub-slug>.webp`"** after 3g, with:

| Property | Spec |
| --- | --- |
| Files | `images/services/subs/<sub-slug>.webp` — one per subcategory (~48 files) |
| Ratio / size | Square — 480 × 480 px, ≤ 30 KB |
| Style | SAME circular-badge language as the 14 category icons (blue ring, dimensional objects, white bg) — a subcategory icon is a more specific scene of its parent (e.g. `kitchen-cleaning` = sink + sponge badge vs the generic cleaning caddy) |
| Fallback | Until a file exists the app shows the current line-glyph — deliver in any order |

Then paste the full slug list from Step 1, grouped by parent category (markdown table: parent · sub-slug · display name). Also update §7 priority order: subcategory icons slot in AFTER card art and banners (tier 3, alongside loop posters).

## Step 5 — Verify

1. `pnpm --filter @urban-assist/customer typecheck` and `pnpm test` (root) — green, currently 154 passing.
2. `pnpm --filter @urban-assist/customer build` — green.
3. Playwright (dev server on :3000), 390×844 AND 1280×900: visit `/services`, `/services/cleaning`, `/services/cleaning/home-cleaning`, `/services/cleaning/home-cleaning/regular-house-cleaning`. Assert: zero images with `complete && naturalWidth === 0` visible (the lucide fallback must have replaced every 404'd sub icon), no horizontal document scroll, pages visually identical to before (no blank chips).
4. Drop ONE test file (copy any existing category webp to `public/images/services/subs/kitchen-cleaning.webp`), reload `/services/cleaning` — the Kitchen Cleaning tile must show it while siblings keep glyphs. Delete the test file after.
5. Run `pnpm sync:images` once and confirm `subs/` fans out to provider/admin.

## Done means

Docs section merged with the real slug list; all 5 call sites render `SubcategoryIcon`; zero visual regression with an empty `subs/` folder; the one-file drop test passes.
