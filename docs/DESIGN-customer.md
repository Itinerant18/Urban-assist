# Urban Assist — Design System

Reference spec for this project. Any new page/component must match these values exactly — do not invent new colors, fonts, spacing, or icon styles.

---

## 1. Brand

- **Name:** Urban Assist
- **Market:** United Kingdom (London-first)
- **Currency:** GBP — always `£`, two decimals for prices that have pence (e.g. `£63.90`), no decimals only if the source data has none.
- **Logo mark:** rounded-square tile, background Slate Navy `#1F3A4D`, white "UA" monogram, 15–16px font-weight 800. Size: 34–36px square, border-radius 9px.
- **Wordmark:** "Urban Assist", weight 800, Slate Navy on light backgrounds / Warm Stone `#F5F1EB` on dark (footer).
- **Tone:** premium, warm, trustworthy, calm — never loud/urgent except in explicit semantic states (amber/rust).

---

## 2. Color Palette

| Token | Hex | Usage |
|---|---|---|
| Slate Navy | `#1F3A4D` | Headings, nav active state, prices, logo, icon accents, footer background |
| Terracotta | `#C1622E` | Primary CTAs ("Book now", "Buy now", "Add"), active nav underline, location-pin icon, promo tag text |
| Terracotta hover | `#A9531F` | Button hover state |
| Sage Green | `#6B8F6B` | Verified checkmarks, "Popular"/"Top rated" badges, trust icons, rating bar for 5★ is NOT sage (see Amber) |
| Warm Stone (bg) | `#F5F1EB` | Page/body background, alternating section band, search-bar fill |
| White | `#FFFFFF` | Card backgrounds, header background, section bands that alternate with Warm Stone |
| Charcoal (text primary) | `#2B2B28` | Body copy, card titles |
| Muted text | `#6B6A62` | Metadata, timestamps, descriptions, breadcrumbs |
| Amber (semantic: in-progress / rating fill) | `#D9A441` | Star ratings (★), review bar-chart fill |
| Rust Red (semantic: urgent/cancelled) | `#B23A2E` | Reserved for error/urgent/cancelled states — not yet used on built pages; use for destructive actions, cancelled bookings, warnings |
| Card border / hairline | `#ECE6D9` | Card borders, section dividers, header bottom border |
| Input/tile border | `#E2DACB` | Search bar border, quick-tile border, icon-button border |
| Placeholder stripe A | `#EDE6D8` / `#E4DBC9` | Diagonal repeating-linear-gradient stripes for image placeholders (warm/neutral content) |
| Placeholder stripe B (sage-tinted) | `#E9F0E9` / `#DEE9DE` | Placeholder stripes for cleaning/appliance imagery |
| Footer text muted | `#9FB1BC` | Footer body copy on navy |
| Footer text faint | `#7E93A0` | Footer copyright line |

**Rules:**
- Never use pure black. Charcoal `#2B2B28` is the darkest text color; Slate Navy is the darkest brand color.
- Max 2 accent hues on screen at once besides navy/terracotta/sage (which are core, not "accents").
- Promo cards may use solid brand-adjacent fills: Slate Navy `#1F3A4D`, a muted terracotta-tan `#E4D4C4` (text: navy/charcoal on this), or a deep sage-charcoal `#2B3F35` (text: warm stone/light sage). Do not introduce further one-off promo colors.

---

## 3. Typography

- **Font family:** `Inter`, loaded from Google Fonts, weights 400/500/600/700/800. Sans-serif fallback only.
- **Scale (desktop):**
  - Hero H1: 44px / line-height 1.12 / weight 800 / letter-spacing -0.02em / Slate Navy
  - Section H2: 26px / weight 800 / Slate Navy
  - Sub-section H2 (detail pages): 20–22px / weight 800 / Slate Navy
  - Card title: 14–15px / weight 700 / Charcoal
  - Body / description: 13–14px / weight 400 / Muted `#6B6A62`
  - Price: 14–16px / weight 800 / Slate Navy
  - Old/struck price: 12px / Muted, `text-decoration: line-through`
  - Meta (ratings, timestamps, breadcrumbs): 11–13px / weight 400–600 / Muted
  - Nav links: 15px / weight 500 (inactive) or 700 with 2px Terracotta bottom-border (active)
  - Badge text: 10–11px / weight 800 / uppercase, letter-spacing 0.04em where used on promo tags
- Never go below 11px for any UI text. Never use a font other than Inter.

---

## 4. Spacing, Radius, Shadow

- **Radius:** cards/images 12–18px (buckets: 10px small controls, 12–14px cards, 16–18px hero imagery/promo blocks). Pills/circular icon buttons: 50%.
- **Shadow:** soft only — `0 4px 14px rgba(31,58,77,0.05)` for cards, `0 8px 24px rgba(31,58,77,0.06)` for hero panels. Never heavy/dark shadows.
- **Grid gaps:** 12px (tight tile grids) / 18–20px (card rows) / 28–48px (major section padding).
- **Page container:** `max-width: 1440px`, side padding 24–48px (48px on homepage, 24px on detail pages — keep consistent within one page).
- **Section vertical rhythm:** 48–56px padding between major sections; alternate white/Warm-Stone bands to create rhythm (max 2 bg colors per page).

---

## 5. Iconography

- Simple **line icons only** — SVG, `stroke` based, `stroke-width="2"`, no fill except small solid dots/shapes.
- Never hand-draw complex illustrative SVGs. Primitives only: circle, line, path with straight/simple curves (location pin, search magnifier, cart, profile, chevron, checkmark‑ish paths).
- Star rating glyph: unicode `★` in Amber `#D9A441` — not an SVG star.
- Verified checkmark: unicode `✓` in Sage `#6B8F6B`.
- Chevron/expand icons: simple `<path d="M6 9l6 6 6-6">` stroke, Muted color.
- Icon buttons: 38–40px circular, 1px `#E2DACB` border, white fill.

---

## 6. Imagery Placeholders

No real photography yet. All imagery slots use a **diagonal repeating-linear-gradient stripe** placeholder with a centered monospace caption describing the real content to drop in, e.g. `AC service — photo`.

```
background: repeating-linear-gradient(135deg, #EDE6D8, #EDE6D8 10px, #E4DBC9 10px, #E4DBC9 20px);
```
- Font for captions: `monospace`, 10–12px, color `#8A8574`, centered, padded.
- Two stripe palettes in rotation: warm-stone tan (default) and sage-tinted (`#E9F0E9`/`#DEE9DE`) for cleaning/greenery-adjacent content — don't mix more than these two per page.
- Replace with real UK home-services photography when available: bright, professional, trustworthy — not glossy stock.

---

## 7. Components

### Header
- Sticky, white background, 1px `#ECE6D9` bottom border.
- Left: logo. Center-left: nav links (Home active w/ Terracotta underline). Right: location icon-button, search bar (Warm Stone fill, magnifier icon + placeholder text), cart icon button, profile icon button.
- Must remain responsive: search bar `flex:1 1 120px; min-width:0`, all icon buttons `flex-shrink:0`, nav/logo `flex-shrink:0`, wrap allowed at very narrow widths.

### Buttons
- Primary CTA: Terracotta fill `#C1622E`, white text, weight 700, radius 8–10px, padding ~11px 22px; hover `#A9531F`.
- Secondary/outline: white fill, Terracotta 1–1.5px border + text; hover inverts to Terracotta fill / white text.
- "Add" button (service line items): outline style, pill-ish radius 8px, small padding (7px 20px).

### Cards
- White background, `#ECE6D9` 1px border (or shadow-only, no border, for most-booked/category cards), radius 12–16px.
- Image block on top (placeholder stripe), padding 12–14px below with title (weight 700), rating row (★ + number), price row (current + optional struck old price).
- Optional badge, top-left of image: Sage `#6B8F6B` fill, white text, e.g. "Popular", "Top rated", "Verified".

### Quick-tile grid (hero "What are you looking for?")
- 3-column grid, white parent card, each tile: bordered box, small colored icon swatch (tinted bg + solid inner square), label, optional time meta in Sage.
- Hover: border → Terracotta, background → very light terracotta tint `#FBF4EE`.

### Promo cards (3-up row)
- Full-bleed color fill (see palette rule above), 18px radius, optional uppercase tag pill top-left (translucent white overlay), bold title, muted-on-color subtitle, Terracotta CTA button bottom.

### Service detail line item (category page pattern)
- Row: title (700) → rating+reviews meta → bold price ("Starts at £X") → short description → "View details" text link (Terracotta) — paired with a small placeholder thumbnail and an outline "Add" button stacked to the right.
- Grouped under H2 section headers (e.g. "Repair", "Installation & uninstallation").

### Trust / Promise box
- White card, bordered, title "Urban Assist Promise", 3 rows of Sage checkmark + label (Verified Professionals / Hassle-Free Booking / Transparent Pricing).

### FAQ accordion
- Row: bold question + chevron-down icon, muted answer text below (currently always expanded in static mockups — wire up real toggle behavior when interactivity is added).

### Reviews
- Rating summary: large bold average, review count, 5-row horizontal bar chart (Amber fill on `#ECE6D9` track) for star distribution.
- Review card: name + star (Amber) top row, muted date/location line, Charcoal review text.

### Footer
- Slate Navy `#1F3A4D` background, 4–5 column grid: brand blurb, Company, For customers, For professionals, Social links + app-store badges.
- Column headers: Warm Stone `#F5F1EB`, weight 700. Links: `#9FB1BC`. Divider: `rgba(245,241,235,0.14)`. Copyright line: `#7E93A0`, 12px.
- Copy: "© 2026 Urban Assist Services Ltd. Registered in England & Wales. All rights reserved."

---

## 8. States & Semantics

- **Verified / trust:** Sage Green `#6B8F6B`.
- **In-progress / pending:** Amber `#D9A441` (also doubles as the star-rating color — don't let this create ambiguity in booking-status contexts; label pending states explicitly with text, not color alone).
- **Urgent / cancelled / error:** Rust Red `#B23A2E`. Not yet used in built screens — apply to cancellation banners, form errors, destructive-action confirmations when built.
- **Hover:** buttons darken/invert per Section 7; cards/tiles get a subtle border-color shift to Terracotta, no scale/shadow-pop effects.
- **Disabled:** not yet defined — default to 40% opacity + no pointer events until specified.

---

## 9. Animation

No motion system has been built yet — all pages are static mockups. If/when animation is added:
- Keep it minimal: color/border transitions on hover (150–200ms ease), no bouncy easing, no parallax, no auto-playing carousels without pause controls.
- Do not add motion "for polish" unilaterally — confirm with design owner first, per project content guidelines.

---

## 10. Page Inventory (built so far)

1. **`Home Services Homepage.dc.html`** — full marketplace homepage: header, hero (quick tiles + collage), 3-up promo row, "Most booked services" rail, three category sections (Cleaning / Pest control / Repair & installation), footer.
2. **`Service Detail - Washing Machine Repair.dc.html`** — category/service detail template: breadcrumb strip, service header + thumbnails, grouped service line-items with Add, sticky cart + Promise box, FAQ + location blurb, reviews with rating bar chart, About section, Quick Links accordion, footer.

Use these two files as the literal source of truth for exact class-free inline styles — this document summarizes them, but the `.dc.html` files are canonical if there's ever a conflict.

---

## 11. Content Rules

- All service names, prices, and categories should trace back to the real UrbanAssist UK service catalog (Cleaning, Repair, Decoration, Installation, Maintenance, Assemble, Laundry, Pest Control, Energy Efficiency, Beauty, Gardening, Auto, Homefix) — do not invent unrelated categories.
- Ratings/review counts on new items should stay in the realistic 4.6–4.9 / thousands-to-hundreds-of-thousands range already established, unless real data is supplied.
- No filler/placeholder marketing copy beyond what's structurally necessary — every card needs a real (or catalog-sourced) name and price, not lorem ipsum.
