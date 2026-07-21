# Urban Assist — Admin Dashboard Design Plan
_Bento · minimalism · warm-light only (no dark)_

Hand this to Grok after Codex finishes Phase 2. Execute in the phase order at the bottom.

---

## 0. Golden rules (do not violate)

1. **Tokens only — no raw hex, no dark palette.** Every color comes from the existing UI preset. Never introduce a new hex or a dark surface. The whole system is warm-light by design.
2. **Server components stay server components.** Most admin pages are `async` server components that call `requireAdminPermission` and server actions. Design work is **markup + classes only** — do not convert to client components, do not touch data fetching, server actions, or the `append_admin_action_log` audit calls.
3. **No new dependencies.** Tailwind + the existing tokens + lucide-react icons. No chart libs, no UI kits.
4. **Additive.** Don't rename tokens or delete classes other apps share (`packages/ui`). If a token is missing, add it to the preset additively.
5. **Density with air.** Minimalism here = generous whitespace + few borders + one accent, NOT cramming. Bento tiles breathe.

---

## 1. Locked design tokens (already in `packages/ui`)

| Token | Value | Use |
|---|---|---|
| `bg` | Warm Stone `#F5F1EB` | page background |
| white | `#FFFFFF` | card/tile surface |
| `ink` | Slate Navy `#1F3A4D` | headings, primary text, numbers |
| `muted` | `#6B6A62` | secondary text, labels |
| `hairline` | `#ECE6D9` | 1px borders, dividers |
| `accent` | Terracotta `#C1622E` | ONE primary action / active nav / key metric |
| `accent-hover` | `#A9531F` | hover |
| `success` | Sage `#6B8F6B` | positive states, approved |
| `danger` | Rust `#B23A2E` | destructive, errors, low ratings |
| radius | `xl 14` · `2xl 18` · `3xl 24` | tiles use `2xl`, inner chips `xl` |
| shadow | `card 0 4px 14px rgba(31,58,77,.05)` · `hero` | tiles = card; hero tile = hero |
| font | Inter (`font-display`) · JetBrains Mono (`font-mono`) | numbers/codes = mono |

**Proposed additive tokens** (add to `packages/ui/tailwind-preset.js`, keep light):
- `surface-sunk: #EFEAE1` — a slightly deeper warm tone for the page gutter behind bento tiles, so white tiles pop. (`--surface-sunk: 239 234 225`)
- Spacing rhythm: standardize on a **4px base**; bento gap = `gap-4` (16px) desktop, `gap-3` mobile.
- Tint helpers (already do-able with `/10` alpha): `bg-accent/8`, `bg-success/10`, `bg-danger/8` for soft tile accents.

---

## 2. Spacing & rhythm system

- **Base unit 4px.** Only use multiples: 4, 8, 12, 16, 24, 32, 48.
- **Page shell:** content padding `p-6 lg:p-8`, max width `max-w-[1200px] mx-auto` (dashboards can go `1440`).
- **Section stack:** `space-y-6` between major sections; `space-y-3` within a card.
- **Page header:** `mb-8`, title `font-display text-2xl font-bold text-ink`, subtitle `text-sm text-muted mt-1`.
- **Tile internal padding:** `p-5` (tiles), `p-4` (compact list rows).
- **Never** stack two shadows or two borders on the same element — pick one (border for flat lists, shadow for elevated tiles).

---

## 3. Bento grid system

The signature. A responsive 12-col (desktop) / 6-col (tablet) / 2-col (mobile) grid where tiles claim different spans to make an asymmetric, magazine-like board.

```
grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-3 lg:gap-4 auto-rows-[minmax(120px,auto)]
```

**Tile primitive** (new shared class or component `BentoTile`):
```
rounded-2xl border border-hairline bg-white p-5 shadow-card
flex flex-col justify-between
transition-transform duration-150 hover:-translate-y-0.5
```
Span helpers via `col-span-*` / `row-span-*`. Guidance:
- **Hero tile** (1 per board): `lg:col-span-6 lg:row-span-2`, `shadow-hero`, holds the headline metric + mini trend.
- **Metric tiles:** `lg:col-span-3`.
- **Wide list/table tile:** `lg:col-span-8`.
- **Rail tile** (side info): `lg:col-span-4`.
- Keep **one** accent tile per board (e.g. GMV in `bg-accent/8` with `text-accent` number). Everything else white. Restraint = premium.

Anti-patterns: no cards-inside-cards-inside-cards; max one level of nesting inside a tile. No 3+ different tile background tints on one board.

---

## 4. Component specs (reskin, keep behavior)

### Stat tile
```
label: text-xs text-muted
value: text-2xl lg:text-3xl font-bold text-ink font-mono tracking-tight
delta/sub: text-[11px] text-muted mt-1  (use text-success / text-danger for signed deltas)
```
Optional lucide icon top-right in `text-muted`, `h-4 w-4`.

### Section header (inside a board)
```
text-sm font-bold text-ink   + optional text-xs text-muted trailing
mb-3, with a 1px hairline divider under only when the section is long
```

### List row (bookings, customers, providers, promos)
- Replace bordered stacked cards with a **single grouped table-tile**: one `rounded-2xl border border-hairline bg-white`, rows separated by `divide-y divide-hairline`, each row `px-5 py-3 hover:bg-bg/60`.
- Row = leading identity (name + mono id/email) · middle meta · trailing status chip + chevron.
- This reads far cleaner than N separate shadowed cards.

### Status chip
```
inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
approved/active: bg-success/12 text-success
pending/neutral: bg-hairline text-muted
urgent/failed:   bg-danger/10 text-danger
info/accent:     bg-accent/10 text-accent
```
Mono for codes (`font-mono`), never for prose.

### Buttons
- Primary: `rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover`
- Secondary: `rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink hover:bg-bg`
- Destructive: text-only `text-danger text-xs hover:underline` for low-emphasis (deactivate), solid danger only for true destroy.
- One primary per view.

### Inputs / forms (pricing, promotions, wallet grant)
```
rounded-xl border border-hairline bg-bg px-3 py-2 text-sm text-ink
placeholder:text-muted focus:border-accent focus:outline-none
label: text-xs text-muted, field mt-1
```
Group form controls in a single tile, not scattered.

### Empty state
Center in a tile: lucide icon `h-8 w-8 text-muted`, one `text-sm text-muted` line, optional secondary action. No illustration art.

### Table (audit log, transactions)
Full-width tile, sticky header row `text-xs text-muted uppercase tracking-wide`, body `text-sm text-ink`, `divide-y divide-hairline`, right-align numerics (mono). Horizontal scroll wrapper `overflow-x-auto` so the page never scrolls sideways.

---

## 5. Global shell

- **Sidebar** (`nav-links.tsx` desktop): keep width `w-56`, white, `border-r border-hairline`. Active item: `bg-accent/10 text-ink font-semibold` + `text-accent` icon (already close). Add **section labels** (`text-[10px] uppercase tracking-wider text-muted px-2 mt-4 mb-1`) grouping: _Operations_ (Dashboard, Bookings, Scheduling), _People_ (Providers, Customers, Staff, KYC), _Commerce_ (Financials, Pricing, Promotions), _Insight_ (Ratings, Analytics, Audit), _Support_ (Tickets).
- **Topbar**: slim, warm-white, holds the existing search + the identity block. Search input uses the input spec above.
- **Page gutter**: set the main content background to `surface-sunk` so white bento tiles lift; sidebar + tiles stay white.
- **Logout / identity**: bottom of sidebar, muted, unchanged behavior.

---

## 6. Per-page bento layouts

**Dashboard** (`/` , `/dashboard`) — the showcase board:
- Hero tile (col-span-6, row-span-2): today's bookings funnel or GMV headline + sparkline row of the last 14 days (CSS bars, no chart lib).
- 4 metric tiles (col-span-3 each): Active jobs · Completion rate · New provider applications · Disputes open.
- Wide tile (col-span-8): "Today's exceptions" list (unassigned, no-shows, delays).
- Rail (col-span-4): live activity feed (recent status changes).

**Bookings** `/bookings`: filter bar as a slim tile on top; results as one grouped table-tile. Detail `/bookings/[id]`: 2-col — left timeline tile (status history), right stacked tiles (customer, payment, assignment).

**Providers / Customers**: search tile + grouped table-tile. Detail = bento of identity tile + KPI metric tiles + history table-tile + (customers) wallet tile.

**Analytics**: pure bento of stat tiles; one accent tile for GMV. Group by row: Revenue row, Volume row, Quality row.

**Pricing / Promotions / Wallet-grant**: forms grouped in one tile per concern; lists as grouped table-tiles with inline status chips.

**Scheduling / Ratings / Audit / Tickets**: table-tile forward; Ratings uses the star row + danger tint for ≤2★ rows; Audit is the reference wide table.

---

## 7. Motion (subtle only)

- Tile hover: `-translate-y-0.5` + shadow step, `duration-150`.
- Nav/chip/button color transitions `transition-colors`.
- No parallax, no scroll-jacking, no entrance animations on data tiles (they'd flash on every server render). Respect `prefers-reduced-motion`.

---

## 8. Accessibility

- Text on white/`bg`: ink & muted both pass AA. Accent text only on `accent/8-12` tints or as large numbers — verify AA for any accent-on-white body text (it's borderline; prefer accent for numbers/borders, not small text).
- Focus: keep the preset's `outline: 2px accent`. Never remove focus rings.
- Hit targets ≥ 40px for row actions and nav.
- Status never encoded by color alone — always a word/label beside the tint.

---

## 9. Grok execution guide

**File map:**
- Tokens (if adding `surface-sunk`): `packages/ui/tailwind-preset.js` + `packages/ui/src/globals.css`.
- Shared primitives: add `BentoTile`, `StatTile`, `StatusChip`, `TableTile` to `packages/ui` (or `apps/admin/components`) so pages compose them.
- Shell: `apps/admin/app/(app)/layout.tsx`, `nav-links.tsx`.
- Pages: `apps/admin/app/(app)/**/page.tsx` — markup/class swaps only.

**Do:** reuse tokens, keep server actions & audit calls intact, one accent per board, `overflow-x-auto` on tables, verify `pnpm --filter @urban-assist/admin typecheck` + build after each page.

**Don't:** add deps, introduce dark surfaces or new hex, convert server → client components, touch `requireAdminPermission`/data fetching, nest cards >1 level, animate data tiles.

**Suggested order:**
1. Add primitives (`BentoTile`/`StatTile`/`StatusChip`/`TableTile`) + optional `surface-sunk` token.
2. Shell (sidebar grouping + gutter).
3. Dashboard bento (highest visual payoff).
4. Analytics (pure tiles — fast win).
5. List pages → grouped table-tiles (bookings, customers, providers, promotions).
6. Detail pages → bento (booking, provider, customer+wallet).
7. Forms polish (pricing, promotions, wallet grant).
8. Sweep: audit, ratings, scheduling, tickets.

**Acceptance per page:** typecheck + build green · no raw hex · no dark surface · one primary action · one accent tile max · tables scroll internally · focus rings intact.
