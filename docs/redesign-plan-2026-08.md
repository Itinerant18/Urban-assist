# Urban Assist — Full UI Redesign Plan (2026-08)

Handoff document for opencode. Execute top-to-bottom per phase. Claude will verify each phase in-browser afterward and apply tweaks.

## 0. Ground rules (read first, apply to EVERY change)

**Palette is FROZEN.** Keep the existing warm theme exactly as tokenised in
`packages/ui/src/globals.css`: Warm Stone bg `#F5F1EB`, Slate Navy ink `#1F3A4D`,
Charcoal body `#2B2B28`, **Terracotta accent `#C1622E`** (hover `#A9531F`),
**Amber `#D9A441`** (ratings/highlights), Sage success, Rust danger.
Never hardcode new hex values in components — use the Tailwind tokens
(`text-ink`, `bg-accent`, `text-amber`, `border-hairline`, `bg-bg`, `text-muted`,
`text-accent-deep`, `bg-surface-sunk`, `border-input-border`). AA rule: `accent`,
`success`, `amber` as TEXT smaller than 18px bold must use the `-deep` variants
(`text-accent-deep`, `text-success-deep`, `text-amber-deep`).

**Motion rule of the house (do NOT violate):**
- CSS/Tailwind only for entrances, hovers, micro-interactions. Use the existing
  `<Reveal index={n}>` wrapper from `@urban-assist/ui` (IntersectionObserver + CSS).
- framer-motion is quarantined to `LiveStatusTrack` — do NOT import framer-motion
  anywhere new.
- Available animation utilities (tailwind preset): `animate-fade-in`,
  `animate-pop-in`, `animate-float` (6s y-drift), `animate-float-late` (7s, 1.2s delay).
- Tactile press: add `active:scale-[0.98]` or `active:-translate-y-[1px]` to buttons.
- Never animate top/left/width/height — transform + opacity only.

**Layout rules:**
- Asymmetry over symmetry: fractional grids (`lg:grid-cols-[7fr,5fr]`,
  `lg:grid-cols-[2fr,3fr]`), left-aligned section headers. Centered H1/H2 banned
  on desktop.
- Equal-card rows (3-across, 4-across identical cards) banned — replace with
  divide-y lists, 2-col zig-zags, or featured+stack compositions.
- Mobile (<768px): every asymmetric grid collapses to single column
  (`grid-cols-1`), `px-4`, full-width. No horizontal scroll ever.
- Full-height sections: `min-h-[100dvh]`, never `h-screen` (iOS Safari).
- Cards only where elevation means something; prefer `border-t` / `divide-y`
  grouping + whitespace.

**Type rules:**
- Font is now **Outfit** (already wired: `--font-sans` in customer
  `app/layout.tsx` + preset fallbacks — DONE, do not redo).
- Display headlines: `text-4xl md:text-6xl font-extrabold tracking-tighter leading-none text-ink`.
- Body: `text-[14px]` or `text-[15px]` `leading-relaxed text-muted max-w-[65ch]`.
- Numbers/prices in data contexts: `font-mono-utility`.
- Kickers/eyebrows: `font-mono-utility text-[11px] uppercase tracking-[0.14em] text-accent-deep`.

**Content rules:** no emojis anywhere. No "Elevate/Seamless/Unleash" copy. Keep
existing UK-flavoured copy voice ("Book without the phone-tag").

**Icons:** keep `lucide-react` (already installed everywhere) — do NOT add
Phosphor/Radix. `strokeWidth` default; sizes `h-4 w-4` / `h-5 w-5`.

**After each file: run `pnpm --filter customer typecheck` (or the app you touched).**

---

## 1. ALREADY DONE by Claude (do not redo, do not revert)

- `packages/ui/tailwind-preset.js`: `float` keyframes + `animate-float` /
  `animate-float-late`; font fallbacks Inter→Outfit.
- `apps/customer/app/layout.tsx`: `Inter`→`Outfit` via next/font
  (`const outfit`, `outfit.variable` on `<html>`).

---

## 2. PHASE 1 — Customer landing page (desktop) 

### 2.1 `apps/customer/components/hero.tsx` — full rewrite

Current: white bg, centered-ish split, category tile grid inside hero
(duplicates CategoryGrid below). Kill the in-hero tile grid entirely.

Target (server component, no 'use client'):

```
┌────────────────────────────────────────────┬──────────────────────┐
│ KICKER (mono, accent-deep, uppercase)      │   art collage        │
│ H1 display 2 lines, tracking-tighter       │  ┌──────────┐        │
│   "Home services," / "sorted."             │  │ big img  │ rotate │
│   ("sorted." gets amber underline svg)     │  │(cleaning)│ -1deg  │
│ sub copy max-w-md                          │  └──────────┘        │
│ PostcodeGate variant="hero" (moved here)   │      ┌────────┐      │
│ promo chip (amber/10 bg, amber-deep text)  │      │ small  │ +2deg│
│ trust row: divide-x, 3 items, 12px         │      │(plumb.)│float │
│                                            │      └────────┘      │
│                                            │  price chip floats   │
└────────────────────────────────────────────┴──────────────────────┘
```

Implementation spec:
- Section: `bg-bg pt-14 pb-16` (blends with page, no white band).
- Container: `mx-auto max-w-page px-6`, grid `lg:grid-cols-[7fr,5fr] gap-12 lg:gap-16 items-center`.
- Kicker: `font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep` —
  copy: `London & the South East — vetted pros`.
- H1: `mt-4 text-[44px] lg:text-[58px] font-extrabold leading-[1.04] tracking-[-0.03em] text-ink`.
  Line 1 `Home services,` line 2 `sorted.` — wrap `sorted.` in a relative span with an
  absolutely-positioned amber underline: inline SVG `<svg viewBox="0 0 120 8">` single
  hand-drawn-ish path, `stroke-amber`, `stroke-[3]`, `fill-none`, placed `absolute -bottom-1 left-0 w-full`.
- Sub: `mt-5 max-w-md text-[15px] leading-relaxed text-muted`.
- PostcodeGate: `<PostcodeGate variant="hero" placeholder="e.g. EC1A 1BB" className="mt-8 max-w-md" />`
  (check the component accepts className; if not, wrap in div). Below it keep the helper line
  `text-[12px] text-muted mt-2`.
- Promo chip (if promoCode): `mt-4 inline-flex items-center gap-2 rounded-full bg-amber/10 border border-amber/30 px-3.5 py-1.5`
  → `<BadgePercent className="h-4 w-4 text-amber-deep" />` +
  `text-[12px] font-semibold text-amber-deep` "Use code X — save on your first booking".
- Trust row: `mt-9 flex divide-x divide-hairline text-[12px] font-semibold text-charcoal`,
  3 items each `px-4 first:pl-0 flex items-center gap-1.5`:
  ShieldCheck+`Vetted pros`, BadgePoundSterling+`Fixed prices`, CalendarCheck+`Reschedule free`.
  Icons `h-4 w-4 text-success-deep`.
- Right collage (hidden below lg: `hidden lg:block relative`):
  - Wrapper `relative h-[460px]`.
  - Big card: `absolute right-8 top-0 w-[340px] rotate-[-1.5deg] rounded-2xl border border-hairline bg-white p-2 shadow-card`
    containing `<ServiceImage slug="home-cleaning-big" caption="" variant="card" />` in
    `aspect-[4/5] overflow-hidden rounded-xl`.
  - Small card: `absolute bottom-2 left-0 w-[220px] rotate-[2deg] rounded-2xl border border-hairline bg-white p-2 shadow-card animate-float`
    with `<ServiceImage slug="plumbing-solution" ... />` in `aspect-square rounded-xl overflow-hidden`.
  - Price chip: `absolute right-0 bottom-24 animate-float-late rounded-xl bg-ink px-4 py-2.5 shadow-card`
    → `text-[10px] uppercase tracking-wider text-footer-muted` "From" +
    `text-[18px] font-extrabold text-white font-mono-utility` "£15.00", small amber Star icon `fill-amber text-amber`.
  - All decorative imgs `aria-hidden`, empty alt.
- Wrap left column in `<Reveal>`, collage in `<Reveal index={2}>`.
- Delete the `categories` prop usage for tiles; keep `categories` OUT of props if unused
  (update `page.tsx` call → `<Hero promoCode={data.promoCode} />` and the interface).

### 2.2 `apps/customer/components/how-it-works.tsx` — rewrite body

Kill 3-equal-cards. Target: asymmetric split `lg:grid-cols-[2fr,3fr] gap-12`.

- Left column (self-start, `lg:sticky lg:top-24`):
  kicker (same recipe) `How it works`;
  H2 `mt-3 text-[30px] font-extrabold tracking-tight text-ink leading-tight` "Book without the phone-tag";
  sub `mt-2 text-[14px] text-muted max-w-[36ch]`;
  CTA button (existing accent recipe) `mt-7`, add `active:scale-[0.98]`.
- Right column: `<ol className="divide-y divide-hairline">`, each step
  `<Reveal index={i}>` wrapping `li` `flex items-center gap-6 py-6 first:pt-0`:
  - Ghost numeral: `text-[64px] font-extrabold leading-none text-ink/[0.08] w-16 shrink-0 select-none` `0{i+1}`.
  - Text block: title `text-[16px] font-bold text-ink`, detail `mt-1 text-[13px] text-muted`.
  - StepArt: `hidden sm:block h-20 w-20 rounded-xl overflow-hidden bg-bg shrink-0 ml-auto`
    with `<StepArt index={i+1} className="h-full w-full object-cover" />`.
- Section stays `bg-bg py-16` → change to `bg-white py-16` (hero is now bg-bg; alternate bands).

### 2.3 `apps/customer/components/why-us.tsx` — rewrite body

Kill 4-equal-cards. Target: editorial band, `bg-bg py-16`.

- Header row: left-aligned. Kicker `Why Urban Assist`; H2 same recipe as 2.2
  ("The boring stuff, guaranteed"). Keep copy professional.
- Grid: `mt-10 grid gap-x-12 gap-y-0 md:grid-cols-2` — each item is a ROW not a card:
  `flex gap-4 border-t border-hairline py-6` (`<Reveal index={i}>` each):
  - Icon tile: `grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/10`
    with icon `h-5 w-5 text-amber-deep` — replaces the all-sage circles; vary NOTHING else.
  - Title `text-[15px] font-bold text-ink`; desc `mt-1 text-[13px] leading-relaxed text-muted`.
- Remove the per-item `color: '#6B8F6B'` hardcodes entirely.

### 2.4 `apps/customer/components/testimonials.tsx` — rewrite body

Kill 3-equal-cards. Target `bg-white py-16`, `lg:grid-cols-[3fr,2fr] gap-10`.

- Header (full-width above grid, left-aligned): kicker `Reviews`; H2 "Trusted in real homes";
  sub keeps "Trusted by thousands of UK households".
- Left: FEATURED quote — `rounded-2xl bg-ink p-8 text-white` (mirrors mobile CustomerProof —
  brand echo): amber stars row (Star icons `h-4 w-4 fill-amber text-amber`, not unicode ★),
  quote `mt-4 text-[17px] leading-relaxed`, author row `mt-6` with ReviewAvatar +
  name `font-bold text-white` + location `text-footer-muted text-[12px]`.
  Uses `reviews[0]`.
- Right: `reviews[1..2]` stacked, `divide-y divide-hairline` — each `py-5 first:pt-0`:
  stars (smaller `h-3.5 w-3.5`), quote `mt-2 text-[13px] text-charcoal leading-relaxed line-clamp-3`,
  author `mt-3` small.
- Keep `if (reviews.length === 0) return null;`. Handle length 1–2 gracefully
  (right column renders whatever exists).
- Delete the `stars()` unicode helper — Star icons only.

### 2.5 `apps/customer/components/featured-services.tsx` — restyle

Keep the divide-y list (already correct pattern). Changes only:
- Outer tinted box: replace hardcoded `#E8F0E8`/`#E2DACB` with
  `rounded-2xl border border-input-border bg-amber/[0.07] p-6 sm:p-8`.
- Header: kicker `Most booked this month` style upgrade — H3
  `text-[22px] font-extrabold tracking-tight text-ink`; keep "View all" link but
  `text-accent-deep hover:text-accent` + ArrowRight `h-4 w-4`.
- Price: add `font-mono-utility`.
- Each row: add `transition hover:bg-white/60 rounded-lg px-2 -mx-2` (subtle row hover),
  wrap rows in `<Reveal index={i}>`.
- Icon tile: `bg-accent/10` → keep; icon `text-accent-deep`.

### 2.6 `apps/customer/components/category-grid.tsx` — light touch ONLY

Bento already good. Only:
- Header: add kicker above H2 (`Explore`), keep left-aligned layout as is.
- Replace ALL inline `style={{ borderColor: '#ECE6D9' }}` with `border-hairline` class.
- In `badgeColors`, values stay (they're brand hexes used as chip fills — acceptable),
  no structural change.
- Add `active:scale-[0.98]` to tile anchors; existing hover states stay.

### 2.7 `apps/customer/components/footer.tsx` — light touch ONLY
Read it first; keep structure. Ensure: bg-ink, left-aligned columns, amber hover
accents on links (`hover:text-amber` where currently white), mono-utility for the
copyright line. Nothing bigger.

### 2.8 `apps/customer/app/(dashboard)/page.tsx`
- Update Hero call per 2.1 (`categories` prop removed).
- Desktop section order stays: Hero → CategoryGrid → PromoCarousel → HowItWorks →
  FeaturedServices → WhyUs → Testimonials.
- Band rhythm check after edits: Hero `bg-bg` → CategoryGrid `bg-bg`→ change CategoryGrid
  section to `bg-white`; PromoCarousel keep; HowItWorks `bg-white`→ set `bg-bg`;
  FeaturedServices `bg-bg`→ set `bg-white`; WhyUs `bg-bg`; Testimonials `bg-white`.
  Net: alternating stone/white bands, no two identical adjacent.

## 3. PHASE 1b — Mobile home polish (`mobile-home.tsx`)

Structure is already good (dark hero, editorial). Small upgrades only:
- MobileIntro: kicker style on the location line → `font-mono-utility text-[11px] uppercase tracking-[0.14em] text-amber` (icon stays);
  H1 `tracking-[-0.03em]` keep; promo chip → same amber-chip recipe as desktop (bg-white/10 → `bg-amber/15 border border-amber/25`).
- TrustStrip icons: `text-success` → `text-success-deep` on white for AA.
- HowItWorks (mobile fn): ghost-numeral treatment: replace `bg-ink` number circles with
  `text-[28px] font-extrabold text-ink/15 w-8` numerals `01 02 03`, keep row layout.
- CustomerProof: already matches new desktop featured quote — no change.
- All `<section>` bodies: wrap first child in `<Reveal>` where not already animated
  (cheap: wrap the section content div). Skip if it fights the sticky footer.

## 4. PHASE 2 — Booking flow polish (customer)

Files: `app/(dashboard)/book/[serviceId]/book-flow.tsx`, `book/success/page.tsx`,
`bookings/page.tsx`, `bookings/[id]/booking-detail.tsx`.

- book-flow: step indicator → make current step chip `bg-accent text-white` with
  `animate-pop-in` on change; done steps get amber check. Section cards: reduce card
  nesting — the address/schedule/payment sections keep single outer card, inner groups
  become `divide-y` not nested boxes. Date pills + time pills: selected state
  `bg-ink text-white` → keep, add `active:scale-[0.98]`; unselected hover
  `hover:border-accent`. Card element container: `min-h-[48px]` guard already fine.
- success page: keep SuccessCheck draw animation; add `animate-pop-in` to the summary
  card; price line `font-mono-utility`.
- bookings list: rows → `divide-y` list with StatusPill right-aligned, remove
  per-row cards if present.
- NO logic changes anywhere in this phase. Class-level only. Do not touch
  clientSecret/payment code.

## 5. PHASE 3 — Remaining customer pages (consistency sweep)

Files under `app/(dashboard)/`: services, browse, providers, cart, account,
referrals, help, notifications, reviews, saved, chat + `login/`.

Per page apply the same vocabulary (NO new patterns):
- Left-aligned header block: kicker + `text-[26px] font-extrabold tracking-tight` H1.
- Lists → `divide-y divide-hairline`, no card-per-row.
- Empty states: icon in `bg-amber/10` tile + one-line title + one-line hint + CTA.
- Buttons: accent recipe + `active:scale-[0.98]`.
- Prices/numbers: `font-mono-utility`.
- Login page: apply hero typography (kicker + tight H1), keep OTP flow untouched.

## 6. PHASE 4 — Provider app

Provider is mobile-first (pros use phones). Files under `apps/provider/app/(app)/`.
- Root layout: swap Inter→Outfit exactly like customer `layout.tsx` (same diff).
- Home/jobs: job cards → single card per job is CORRECT here (tappable), but tighten:
  status chip top-right, price `font-mono-utility text-[16px] font-extrabold`,
  address secondary line `text-muted text-[12px]`.
- Offer modal: countdown gets `font-mono-utility text-amber-deep`; accept button
  full-width accent + `active:scale-[0.98]`.
- Earnings: totals row `font-mono-utility`; list `divide-y`.
- Keep ALL logic untouched (offer TTL machinery is delicate — class changes only).

## 7. PHASE 5 — Admin

Admin had a recent bento redesign — do NOT restructure. Only:
- layout.tsx font swap Inter→Outfit (same diff).
- Verify `surface-sunk` bento gutters still read correctly with Outfit; fix any
  metric tiles where longer glyphs wrap (add `truncate`/`tabular-nums`).

## 8. Verification checklist (Claude runs after each phase)

1. `pnpm --filter customer typecheck` (+ provider/admin in their phases) — green.
2. `pnpm --filter customer build` for phase 1 — green.
3. Browser at 1280w and 390w: no horizontal scroll, hero collage hidden <lg,
   bands alternate, Reveal fires, floats animate, reduced-motion blanket still
   applies (check globals.css blanket covers `animate-float`).
4. AA spot-check: amber/accent text ≥4.5:1 (use -deep variants on light bg).
5. Booking flow E2E smoke: address→slot→cash booking (do NOT need card).
6. Screenshot diff review by Claude; tweaks land as follow-up commits.

## 9. Commit conventions

One commit per phase, message style:
`feat(customer): landing redesign — asymmetric hero, editorial bands (phase 1)`
Do not mix phases in one commit. Do not touch `supabase/`, `.env`, payment logic.
