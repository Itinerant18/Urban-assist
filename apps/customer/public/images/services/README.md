# Service images

Drop art into this folder, named exactly per the convention below, and the
app picks it up automatically. Anything missing falls back down the chain to
the striped placeholder, so art can be added incrementally with zero code.

After adding files, run `pnpm sync:images` to fan them out to the provider
and admin apps.

## Asset classes

One class per slot, Urban-Company style — never mix.

| Class | File convention | Spec | Used by |
|---|---|---|---|
| Icon | `<slug>.svg` | square illustration; true vectors only (photo-style art → webp) | small square tiles |
| Card | `<slug>-card.webp` | 4:3, 800×600, scene (worker-in-home photo style), subject in 8% safe margins, no text | service cards, home grid |
| Banner | `<slug>-banner.webp` | 21:9, 1680×720, wide environmental scene, left third clear for overlay text | category + subcategory heroes |
| Poster | `<slug>-loop.webp` | 16:9, 1280×720, first-frame-style still | video-loop slots (before any mp4 exists) |
| Video | `<slug>-loop.mp4` | ≤2MB, 720p H.264, muted, 10–20s loop | video-loop slots |
| Before/after | `<slug>-before.webp` / `<slug>-after.webp` | identical framing, 4:3 | before/after slider (cleaning, gardening, painting) |
| Avatar | `people/avatar-01..08.webp` | 256px square, diverse faces, warm light | testimonials, reviews |
| How-it-works | `steps/step-1..3.webp` | square spot illustrations, brand palette | How-it-works sections |

Format rules:

- Photo-style art = **webp** (pre-sized at authoring; plain `<img>`, no
  next/image for local authored assets). True vector spots = svg.
- The legacy `<slug>.svg` icons are raster-wrapped exports; re-export with
  `python scripts/export-webp.py` to keep the webp twin (ServiceImage prefers
  webp, falls back to svg).
- File names are kebab-case, no spaces, no uppercase.
- Keep files self-contained (they're served as plain `<img>` sources).

## Fallback chain

`<slug>-banner.webp → <slug>-card.webp → icon on tinted tile → striped
placeholder`. Icons: `<slug>.webp → <slug>.svg → stripes`.

## Current category slugs (from the live catalog)

| File prefix | Category |
|---|---|
| `cleaning` | Home cleaning |
| `plumbing` | Plumbing |
| `electrical` | Electrical |
| `gardening` | Gardening |
| `appliance-repair` | Appliance repair |
| `handyman` | Handyman |
| `carpentry` | Carpentry |
| `painting` | Painting & decor |
| `locksmith` | Locksmith |
| `pest-control` | Pest Control |
| `heating-gas` | Heating & Gas |
| `air-conditioning` | Air Conditioning |
| `roofing` | Roofing |
| `moving-services` | Moving Services |

Optional extra: `all-services.webp` for the "All Services" browse tile.

## Other folders

`public/media/loops/` — customer-app-only promo/service video loops and their
posters (`<name>.mp4` + `<name>-poster.webp`). Not synced to provider/admin.
