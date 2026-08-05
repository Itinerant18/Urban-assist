# Mobile UI/UX Improvement Plan — Urban Assist

**Scope:** `apps/customer` and `apps/provider` (with `packages/ui` as the shared lever). Planning document only — no source changes accompany it.
**Benchmark:** Urban Company (customer + partner apps), adapted for the UK market (£/GBP, postcode-first addresses, VAT-inclusive pricing, UK trust and GDPR expectations).
**Date:** 2026-08-05

---

## 1. Executive summary

Urban Assist already has a stronger foundation than most teams discover in an audit like this: design tokens are fully centralized in `@urban-assist/ui/tailwind-preset` (every app is a 6-line config wrapper), the palette is coherent and distinctive (terracotta / slate navy / warm stone), UK localization is largely correct (`Intl 'en-GB'` money and dates everywhere, NINO/UTR/sort-code validation, Monday-first calendars, miles), and a 48px `.tap` target utility exists and is widely used. The booking wizard, live status track, and provider job screen are functionally complete.

The gaps are not "rebuild the UI" gaps. They cluster into five themes:

1. **Funnel contradiction (customer).** PRODUCT.md promises a guest-first funnel, but middleware auth-gates `/browse` and `/providers` — the exact pages every public "Book now" CTA routes to. Anonymous users hit a login wall at *discovery*, not commitment. This is the single largest conversion lever in the plan.
2. **Money-display inconsistency (provider).** The same job offer shows **net** earnings in the takeover modal, **gross** in the offer list, and computes commission on a *different base* in the detail view. The offer-expiry copy says "90 seconds" while the constant is 600. For a marketplace, earnings-display trust is the product; this is P0.
3. **Layout collisions on mobile.** Sticky CTAs overlap the bottom tab bar on all four `/services*` routes (customer) and on the offer-accept and earnings-withdraw bars (provider, on notched devices). The mobile home page renders two stacked headers.
4. **Feedback-state debt.** Zero `loading.tsx` files across both apps; three coexisting loading idioms; provider screens swallow fetch errors and render them as empty states — a failed balance fetch displays **£0.00** as if it were truth.
5. **Missing shared primitives.** No Toast, Dialog, BottomSheet, Spinner, Tabs, or Switch in `packages/ui` — so apps hand-roll modals with different scrims, use native `alert()`/`confirm()`, and duplicate status-label maps three divergent ways.

**Stack correction:** there is **no Capacitor anywhere** in the repo. All apps are Next.js 14 App Router PWAs (manifest-only install; `public/sw.js` exists but is never registered). This plan is PWA-first; a P2 spike documents the Capacitor path. Haptics recommendations use the web Vibration API.

**Out of scope / non-goals**

- **Dark mode** (pushed out of scope for this phase; no design or implementation work planned). We design and refine a **single light theme** only — no paired light/dark tokens, no `dark:` Tailwind variants, no toggle, no dark-mode QA. This matches the Urban Company benchmark, which is light-only.
- Rebuilding any screen from scratch; this is an incremental gap-closure plan.
- New heavy dependencies. Everything below is achievable with the existing stack (React, Next.js, Tailwind, cva, framer-motion already in `packages/ui`).
- Backend/schema changes, except where a display bug requires deciding the correct commission base (flagged, not designed, here).

---

## 2. Current-state audit table

Severity: **P0** = trust/conversion breaker or broken UX, **P1** = quality gap vs. benchmark, **P2** = polish/debt.

| # | Screen / area | App | Issue | Evidence | Sev |
| --- | --- | --- | --- | --- | --- |
| 1 | Browse + provider profiles | customer | Auth-gated despite PRODUCT.md "guest-first" principle; all public Book CTAs route here | `middleware.ts:4-18`, `lib/global-mobile-cta.ts:47-93` | P0 |
| 2 | Offer modal / list / detail | provider | Net vs gross shown inconsistently; commission base differs (`price_pence` in modal vs `total_pence` in detail) | `offer-card.tsx:144-150`, `offers-list.tsx:170`, `offer-detail.tsx:94-95` | P0 |
| 3 | Offer countdown | provider | `OFFER_TTL_SECONDS = 600` but UI copy says "90 seconds" in two places | `packages/utils/src/constants.ts:4`, `help/page.tsx:42`, `settings-view.tsx:114` | P0 |
| 4 | Earnings | provider | Failed balance fetch silently renders £0.00; error-as-empty pattern across offers/jobs/dashboard loaders | `earnings/page.tsx:94-100`, `lib/provider-data.ts:78,149` | P0 |
| 5 | `/services*` (4 routes) | customer | Sticky Book CTA overlaps bottom tab bar (`hasBottomTabs()` map disagrees with AppShell) | `lib/global-mobile-cta.ts:27-36` vs `packages/ui/src/app-shell.tsx:16-24` | P0 |
| 6 | Address entry | customer | getAddress.io `addresses[]` returned by API but never consumed — no picker; ward written into city field | `components/address-form.tsx:36-39` | P0 |
| 7 | Mobile home `/` | customer | Two stacked headers (SiteHeader + MobileHome's own `bg-ink` header) | `components/mobile-home.tsx:34`, `components/site-header.tsx:20` | P0 |
| 8 | Booking wizard (mobile) | customer | Sticky bar shows total only — no line-item/VAT/discount breakdown on any step (desktop aside has it all) | `book-flow.tsx:890-920` vs `:805-886` | P0 |
| 9 | Offer accept bar, withdraw bar | provider | Pinned `bottom-16` with no safe-area inset → tab bar overlaps on notched devices; `/documents` submit bar collides with tab bar | `offer-detail.tsx:240`, `earnings/page.tsx:318`, `onboarding-client.tsx:413` | P0 |
| 10 | Offer takeover modal | provider | No `role="dialog"`, no focus trap, no Esc; header `bg-accent text-ink` = 2.85:1 contrast | `offer-card.tsx:109-117` | P0 |
| 11 | All routes | both | Zero `loading.tsx`; 3 coexisting loading idioms; ui `Skeleton` used on only 3 screens total | route trees of both apps | P0 |
| 12 | `/saved` | customer | Rows link to `/profile/:id` — route does not exist; every saved provider 404s | `saved/page.tsx:97` | P0 |
| 13 | Slot booking | both | No `Europe/London` pinning — slots built from device-local time; non-UK device books wrong absolute time | `lib/booking-slots.ts`, `packages/utils/src/format.ts` | P0 |
| 14 | Navigation | provider | 14 of 20 in-app routes highlight no tab; `/account` is a de-facto overflow menu | `app/(app)/layout.tsx:8-15`, `app-shell.tsx:146` | P1 |
| 15 | Cancellation policy | customer | FAQ says free up to 2h; cancel modal says 24h + £10 fee | `[subcategory]/page.tsx:75` vs `booking-detail.tsx:599-601` | P1 |
| 16 | Typography / contrast | both | ~94 uses of 9–11px text (violates own 11px floor); accent/success as small text fail AA; chat timestamps 2.8:1 | e.g. `messages-client.tsx:347`, `earnings/page.tsx:274` | P1 |
| 17 | Shared primitives | all | No Toast/Dialog/BottomSheet/Spinner/Tabs/Switch → hand-rolled modals (2 scrim styles), native `alert()`/`confirm()` | `packages/ui/src/index.ts`; `services-editor.tsx:198,210` | P1 |
| 18 | Status vocabulary | all 3 apps | Booking-status label/tone maps diverge 3 ways (`assigned` = "Scheduled"/accent vs "Upcoming"/muted) | `apps/customer/lib/booking-status.ts`, `jobs-list.tsx:17-34`, `admin/components/bento.tsx:275` | P1 |
| 19 | Print (invoice, earnings) | provider | `.no-print` / `.printable-container` referenced but defined in no CSS file — print outputs full page incl. nav | `invoice-view.tsx:34-35`, `earnings/page.tsx:172-174` | P1 |
| 20 | Push permission | provider | FCM permission prompt fires on mount with no user gesture | `push-registrar.tsx:9-15` | P1 |
| 21 | Job screen | provider | 1024-line monolith; mobile drawer toggle is a `<div onClick>` — keyboard-unreachable | `jobs/[id]/page.tsx:643-658` | P1 |
| 22 | `/privacy`, `/terms` | customer | Redirect to `/coming-soon` — no legal content (UK trust + GDPR expectation) | `app/privacy/page.tsx`, `app/terms/page.tsx` | P1 |
| 23 | Store badges / AppCTA | customer | App Store & Play badges link to `/coming-soon`; no native app exists; AppCTA has fake QR and is dead code | `components/store-badges.tsx`, `components/app-cta.tsx` | P2 |
| 24 | Fonts / images | both | Google Fonts via render-blocking `<link>` (not `next/font`); zero `next/image` usage | all three `layout.tsx` | P2 |
| 25 | Dead infra | both | `sw.js` never registered; provider declares TanStack Query + framer-motion with zero usage | `public/sw.js`, `apps/provider/package.json` | P2 |

---

## 3. Competitive pattern reference

| Pattern | Source | How we adapt it |
| --- | --- | --- |
| Search bar + category icon grid + promo carousel as home hierarchy | Urban Company home | Customer `MobileHome` already approximates this; fix the double-header, add a "resume your booking" chip (UC's own known gap — cart progress lost on drop-off; our sessionStorage wizard persistence makes this cheap to surface) |
| Sticky bottom bar with item count + running total throughout the funnel | UC service detail → cart | Extend `StickyActionBar`: total becomes a tappable disclosure opening a bottom-sheet line-item breakdown (service, discount, VAT, total). Desktop keeps the aside |
| Horizontal date chips + time-slot chip grid (no full calendar) | UC slot picker | Already implemented (14-day strip + six 2h windows) — keep; pin to `Europe/London` and keep the honest "platform windows, not live diary" copy |
| Fewest-steps checkout; merge slot/date/payment where possible | UC case studies (Srivastava, Pani) | Keep 3 steps but make card payment single-tap: create PaymentIntent when step 3 mounts so "Pay" is one action, not Confirm-then-Pay |
| Status timeline + provider card (photo, rating, verified) + chat/call | UC live tracking | `LiveStatusTrack` exists and is good; wire the dead Call button (`tel:` or masked number), label the chat send button |
| Offer card: service, time, area (not exact address), **payout**, countdown timer | UC partner app | Standardize all three offer surfaces on: NET payout prominent + "after X% commission" subtext, same commission base everywhere, one countdown format driven by `OFFER_TTL_SECONDS` |
| Earnings: today/week/month tabs, net prominent, per-job commission line | UC partner earnings | Provider earnings already shows net + fee per job; add period tabs, payout status per row, and a tax-year total (UK self-assessment need UC doesn't have) |
| Postcode-first address entry: postcode → Find → pick from list → manual fallback | Postcoder UX blog, clagnut pattern, econsultancy | `/api/postcode/[code]` already returns `addresses[]` when `POSTCODE_LOOKUP_API_KEY` set — render a picker (radio list per clagnut), keep manual entry as the fallback link, fix ward→city bug |
| VAT-inclusive consumer pricing with "incl. VAT" disclosure | UK consumer pricing rules (redtechnology UX Lab) | Already VAT-inclusive; derive the "(20%)" strings from `VAT_RATE` instead of hardcoding ×4; add VAT number + real invoice to satisfy the "with their invoices" promise in bookings empty-state copy |
| Skeleton loaders shaped like final content, not spinners | industry standard; UC uses shimmer tiles | `Skeleton` primitive exists — add `loading.tsx` files that compose it into card-shaped placeholders per route |
| Bottom sheets for pickers/filters; dialogs only for confirmations | mobile convention | New `BottomSheet` primitive (mobile sheet / desktop modal in one component) replaces the two hand-rolled overlay implementations |
| Haptic feedback on accept/confirm | UC partner accept | Web Vibration API (`navigator.vibrate(10)`) on offer accept, booking confirm, swipe-to-confirm completion — progressive enhancement, no dependency |

---

## 4. Customer app — prioritized backlog

### P0

| Item | Current issue | Proposed fix | Effort |
| --- | --- | --- | --- |
| Guest-first funnel | `/browse`, `/providers` in `PROTECTED_PREFIXES`; anonymous users bounce to login at discovery | Remove both from the middleware list; keep auth at `/cart`, `/book*`, account surfaces. CTAs then flow public → browse → detail → login-at-booking (PRODUCT.md principle 2) | M |
| Sticky CTA / tab bar overlap | `hasBottomTabs()` in `lib/global-mobile-cta.ts` claims `/services*` has no tabs; CTA renders `bottom-0` under the tab bar; `/coming-soon` gets a Book CTA | Correct the route map to match `AppShell.shouldHideBottomNav`; introduce a shared `--tabbar-clearance` variable (see tokens) replacing the three hardcoded `3rem`s; suppress CTA on `/coming-soon` | S |
| Double header on mobile home | `MobileHome` renders its own `bg-ink` header under the sticky `SiteHeader` | One header: fold sign-in affordance into `SiteHeader`, delete the inner header, add `env(safe-area-inset-top)` padding to `SiteHeader` (currently missing) | M |
| Postcode-first address picker | Lookup API returns `addresses[]`; form ignores it, user types line 1 manually; `admin_ward` written into city | After Find: render selectable address list (radio list), autofill line1/line2/city on pick, "Enter address manually" fallback link; map `admin_district` (not ward) to city; add `autocomplete="postal-code | address-line1 | address-level2"` | M |
| Broken saved-provider link | `/profile/${id}` 404s for every row | Point to `/providers/${id}` | S |
| Mobile price transparency | Sticky bar shows only the total; promo/wallet UI duplicated in two places | Total in `StickyActionBar` becomes a disclosure button opening a `BottomSheet` with line item, discount, "VAT (rate from env)", total, promo input, wallet toggle — single source, kills the duplicate block | M |
| Route-level skeletons | No `loading.tsx` anywhere; hard blank on `/browse`, `/bookings`, `/bookings/[id]`, `/messages`, `/account` | Add `loading.tsx` per route group composing ui `Skeleton` into content-shaped placeholders (card list for bookings, thread list for messages, etc.) | M |
| Timezone pinning | Slots built from device-local `new Date(...)`; wrong absolute times abroad | Build and render slots in `Europe/London` (`Intl` with explicit `timeZone`, store UTC); one helper in `packages/utils` | S |
| Contrast + type floor | Chat timestamps `text-white/70` on accent ≈2.8:1 at 9–11px; disabled slots ≈2:1 with only line-through; ~22 uses of 9–10px text | Timestamps → `text-white/90` + 11px; disabled slots add "Past"/strike + muted pattern; sweep `text-[9px]`/`text-[10px]` → `text-[11px]` minimum (PRODUCT.md's own floor) | S |

### P1

- **Single-tap card payment.** Create the booking + PaymentIntent when step 3 mounts (or on first render of the payment choice) so the Stripe element is ready and "Pay £X" is one tap; keep the current two-tap flow as fallback when quote changes. [M]
- **Nested `error.tsx`** for `(dashboard)` and `book` route groups so a render error doesn't replace the entire shell. [S]
- **Cancellation policy single-source.** One constant (hours + fee) feeding both the generated FAQ and the cancel modal; today they contradict (2h vs 24h/£10). [S]
- **VAT strings from config.** Replace the four hardcoded "(20%)" strings and the wallet `£{(x/100).toFixed(2)}` bypasses with `VAT_RATE`-derived copy and `pence()`. [S]
- **A11y semantics batch:** `name` on address radios (broken radio group), fieldset/legend on cancel reasons, `role="alert"` on wizard step errors, `title` on both Maps iframes, `aria-label` on icon-only send button, wire or remove the dead Call and Live-Chat buttons, make "Notify me" a real control, `htmlFor`/`id` on filter selects, location button accessible name below 640px. [M]
- **Real `/privacy` and `/terms` content** — currently redirects to `/coming-soon`; a UK services marketplace cannot ship trust pages as stubs. Also surface a VAT number and a real invoice/receipt (bookings empty-state promises "with their invoices"). [M — content + one template]
- **Wizard resume affordance.** SessionStorage restore is silent; show a dismissible "We saved your progress" chip on re-entry. [S]
- **"favourites" spelling** (UI copy only; keep DB identifiers). [S]

### P2

- `next/font` for Inter + JetBrains Mono (removes render-blocking Google Fonts link); `next/image` migration for provider avatars and service imagery (lazy loading, srcset). [M]
- Haptics: `navigator.vibrate(10)` on booking confirm and payment success (guarded, progressive). [S]
- Register or delete the dead `public/sw.js`; today it's cargo weight. [S]
- Remove App Store/Play badges and dead `AppCTA` component until a native app exists (currently advertise `/coming-soon`). [S]
- "Resume your booking" chip on home fed by the existing wizard sessionStorage (beats UC's known cart-loss gap). [S]
- Recently-viewed services row on home. [M]
- **Capacitor migration spike (doc-only):** evaluate static-export vs remote-URL shell for wrapping the Next.js SSR apps, push/deep-link/OAuth implications, store-listing requirements. Output: decision doc, no code. [M]

---

## 5. Provider app — prioritized backlog

### P0

| Item | Current issue | Proposed fix | Effort |
| --- | --- | --- | --- |
| Offer amount consistency | Modal shows net (base `price_pence`), list shows gross `total_pence`, detail computes commission on `total_pence` | One rule everywhere: **NET prominent**, "£gross − X% commission" subtext; single `splitCommission` call site with one base (confirm correct base against payment records before changing display) | M |
| TTL copy truth | Constant 600s; help + settings say "90 seconds" | Derive all copy from `OFFER_TTL_SECONDS` (format helper: "10 minutes" / "90 seconds") | S |
| Offer modal rebuild | No `role="dialog"`/`aria-modal`/focus trap/Esc; header `bg-accent text-ink` 2.85:1; footer ignores safe-area | Rebuild on the new `Dialog` primitive (trap + Esc included); header → `bg-ink text-bg` or accent with white ≥18px bold; footer `pb-[max(12px,env(safe-area-inset-bottom))]`; vibrate on accept | M |
| Sticky bar overlaps | Accept/decline and withdraw bars at `bottom-16` (no inset) sit under the tab bar on notched devices; `/documents` submit bar collides with tab bar (both `bottom-0 z-50`) | `bottom-[calc(var(--tabbar-clearance)+env(safe-area-inset-bottom))]` for both; `/documents` bar gets tab-bar clearance | S |
| Error honesty | `?? []` and `.catch(() => {})` render failures as empty/zero — a failed balance fetch shows **£0.00**; `jobs/[id]` null-booking crash path | Loaders return `{data, error}`; screens render an error banner + retry distinct from `EmptyState`; earnings never shows a number it didn't fetch; guard the `booking.completion_report` access | M |
| Active-tab mapping | 14 of 20 routes highlight no tab | Explicit route→tab map in the nav config: `/offers`, `/jobs*` → Requests; `/notifications`, `/performance`, `/training`, `/settings`, `/help`, `/profile` → Menu; remove customer-app dead branches from `shouldHideBottomNav` | S |
| Route-level skeletons | 13 server routes with zero loading affordance; `Skeleton` used on one screen | `loading.tsx` for dashboard, offers, jobs, earnings, schedule first; content-shaped `Skeleton` compositions | M |
| Small-text money contrast | `text-success` (3.64:1) and `text-accent` (4.16:1) used for sub-18px money and countdowns; `text-hairline` as text (1.24:1) | New `success-deep` / `accent-deep` text tokens (see §7); separator dots → `text-muted` | S |

### P1

- **Toast + Dialog adoption:** replace native `alert()`/`confirm()` in services-editor, account, onboarding with ui primitives; inline error region for the services editor. [M]
- **Job screen decomposition:** split `jobs/[id]/page.tsx` (1024 lines) into map/timeline/chat/completion modules; drawer toggle becomes a real `<button aria-expanded>`; chat send input/button to `.tap` size. Preserve the excellent `SwipeToConfirm` keyboard path. [L]
- **Online toggle** → `role="switch"` + `aria-checked`; add a textual state that doesn't rely on color alone (exists — keep). [S]
- **Tabs ARIA:** offers/jobs/schedule tablists get `aria-controls` + `tabpanel` roles (or swap to the new `Tabs` primitive). [S]
- **Push permission behind a gesture:** move `registerForPush()` from mount to an explicit enable action (settings toggle exists; add a first-offer prompt card). [S]
- **Print CSS:** define `.no-print` / `.printable-container` in `globals.css` `@media print` — currently referenced but nonexistent, so invoices print with nav. [S]
- **Schedule calendar day cells** 32px → ≥44px. [S]
- **Unify the two 7-day earnings charts** (dashboard + earnings page) into one component fed by `buildWeeklyEarnings`. [M]
- **Payout status per row** — `payout.status` is loaded and never rendered. [S]

### P2

- Lifetime + tax-year (6 Apr–5 Apr) earnings summary and cash-collected totals — UK self-assessment support UC doesn't offer. [M]
- Adopt TanStack Query for the client-fetching screens or drop the dependency; same decision for framer-motion (natural first use: offer-modal entrance + countdown bar). [M]
- Notification bell `aria-label`; onboarding X buttons to `.tap`. [S]

---

## 6. Shared design-system backlog (`packages/ui`)

**P0 — new primitives (unblocks both apps):**

| Primitive | Notes | Effort |
| --- | --- | --- |
| `Dialog` | Focus trap, Esc, scrim `bg-ink/40`, `role="dialog"` + `aria-modal`; replaces 2 hand-rolled modals | M |
| `BottomSheet` | One component: sheet from bottom `<lg`, centered dialog `≥lg` (pattern already hand-rolled in customer booking-detail); drag-to-dismiss optional via framer-motion (already a dep) | M |
| `Toast` | Queue + `role="status"`/`aria-live`; replaces `alert()` and ad-hoc success text | M |
| `Spinner` | Small inline spinner for button-busy states; standardizes the three loading idioms | S |
| Shared status map | `bookingStatusLabel(status)` + `bookingStatusTone(status)` in one module (likely `packages/domain`), consumed by all three apps; kills the 3-way divergence | S |
| `PriceSummary` | Line items / discount / VAT / total; used by booking aside, mobile sheet, invoice | M |

**P1:** `Tabs`, `Switch`, `Checkbox`/`Radio`; migrate provider login onto ui primitives (currently imports zero); radius policy — `rounded-xl` (14px) default, `rounded-2xl` (18px) reserved for hero cards (fix customer's 47× 2xl + 9× 3xl drift; align admin BentoTile later); replace stock `shadow-sm` (38× in customer) with `shadow-card`; fix provider/admin theme-color `#FAFAF8` → `#F5F1EB` (token `--bg`); `next/font` in the preset docs.

**P2:** admin adopts `AppShell`; dedupe `notification-bell` / `push-registrar` (near-identical copies) into a package.

---

## 7. Proposed design tokens

Single **light theme** only (dark mode is a non-goal, §1). The existing palette stays; additions close AA gaps and name what's currently hardcoded. Drop-in for `packages/ui/tailwind-preset.js` + `globals.css`:

```js
// packages/ui/tailwind-preset.js — additions (existing tokens unchanged)
module.exports = {
  theme: {
    extend: {
      colors: {
        // Existing: bg, ink, charcoal, accent, accent-hover, success, danger,
        // amber, muted, hairline, surface-sunk, input-border — KEEP AS IS.

        // New: AA-safe text variants (accent/success/amber pass only as fills
        // or ≥18px bold text; these pass 4.5:1 on white and bg at any size)
        'accent-deep':  'rgb(var(--accent-deep) / <alpha-value>)',  // #8F4620
        'success-deep': 'rgb(var(--success-deep) / <alpha-value>)', // #4E7050
        'amber-deep':   'rgb(var(--amber-deep) / <alpha-value>)',   // #8A6516
      },
      transitionDuration: {
        fast: '150ms',   // taps, hovers, toggles
        base: '250ms',   // sheets, drawers, page elements
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      zIndex: {
        header: '50',   // SiteHeader / app headers (matches current z-50)
        tabbar: '40',
        sticky: '40',   // sticky CTAs — same layer as tabbar, positioned above it
        sheet:  '60',
        modal:  '60',
        toast:  '70',
      },
    },
  },
};
```

```css
/* packages/ui/src/globals.css — additions to :root */
:root {
  --accent-deep: 143 70 32;    /* #8F4620 — terracotta text on white/bg, ≥4.5:1 */
  --success-deep: 78 112 80;   /* #4E7050 — sage text/money at small sizes */
  --amber-deep: 138 101 22;    /* #8A6516 — rating text where amber is text */
  --tabbar-clearance: 3.5rem;  /* single source; replaces hardcoded 3rem × 3 */
}

/* print support (currently referenced but undefined) */
@media print {
  .no-print { display: none !important; }
  .printable-container { box-shadow: none; border: none; }
}
```

**Usage rules (enforced in review, documented in the ui README):**

- `accent`, `success`, `amber` = fills, borders, and text ≥18px bold only. Below that, use the `-deep` variant.
- Text floor: **11px** (`text-[11px]`); prefer 12px. `text-[9px]`/`text-[10px]` are banned.
- `text-hairline` is never a text color (it's a border token, 1.24:1).
- Radius: `rounded-xl` default; `rounded-2xl` hero cards only; no `rounded-3xl`, no arbitrary radii.
- Shadows: `shadow-card` / `shadow-hero` only; stock `shadow-sm|md|lg|xl` are off-menu.
- Every interactive element carries `.tap` (48px) or an explicit ≥44px size.
- Sticky bottom elements: `bottom-[calc(var(--tabbar-clearance)+env(safe-area-inset-bottom))]` when tabs are visible; `pb-[max(12px,env(safe-area-inset-bottom))]` when not.
- Typography scale (existing, now explicit): 11px meta / 12–13px secondary / 14px body (`text-sm`) / 16px emphasized (`text-base`) / 18–20px section titles / 24px page titles (`text-2xl`) / 30px+ display. Weights: 400 body, 500 UI, 600–700 headings, 800 display only.

---

## 8. Suggested implementation order

Ordered for maximum user-visible impact per unit effort; each wave is independently shippable.

**Wave 1 — collision & correctness fixes (all S, ~days).**
Customer CTA/tab-bar overlap · provider `bottom-16` safe-area bars · broken `/saved` link · TTL copy from constant · provider active-tab mapping · contrast token additions + text-floor sweep · timezone pinning · print CSS. *Rationale: pure bug-class fixes, no design decisions, immediately felt.*

**Wave 2 — design-system primitives (M/L).**
`Dialog`, `BottomSheet`, `Toast`, `Spinner`, shared status map, `PriceSummary`. *Rationale: everything in waves 3–4 consumes these; building them first prevents another generation of hand-rolled variants.*

**Wave 3 — customer funnel (M).**
Guest-first middleware change · postcode address picker · mobile price bottom-sheet · single mobile header · route skeletons. *Rationale: the conversion levers; middleware change is one line of code but should ship alongside the polished browse experience it exposes.*

**Wave 4 — provider trust (M).**
Offer-amount consistency (after backend confirms commission base) · error-honesty pass · offer modal rebuild on `Dialog` · provider skeletons. *Rationale: earnings-display integrity; depends on Wave 2 primitives.*

**Wave 5 — P1/P2 polish (ongoing).**
A11y semantics batches · single-tap card pay · job-screen decomposition · `next/font`/`next/image` · legal pages · earnings extras · haptics · Capacitor spike doc.

**Component-sharing opportunities flagged during audit** (fold into waves as touched): provider login → ui primitives; notification-bell + push-registrar → shared package; the two customer `provider-list.tsx` implementations → one; the two 7-day charts → one; admin → AppShell + Badge/EmptyState (P2).

---

*Sources for §3: Urban Company UX case studies on Medium ([Manvi Srivastava](https://medium.com/design-bootcamp/a-48-hour-ux-challenge-enhancing-the-user-experience-of-booking-a-customized-package-on-the-urban-a2a8026c5028), [Md. Zaid Khan](https://medium.com/uxm-community/fixing-the-heat-a-ux-journey-through-urban-companys-ac-service-booking-experience-to-impact-137e4bd7e7ef), [Kumar Aditya Pani](https://bootcamp.uxdesign.cc/enhancing-the-user-experience-of-booking-a-customized-package-on-the-urbancompanys-app-an-b51b5295ad76), [Sneha Tiwari — heuristics evaluation](https://bootcamp.uxdesign.cc/heuristics-evaluation-of-urban-company-a-ux-case-study-b7760b048a5b)); [Urban Company Partner — Google Play](https://play.google.com/store/apps/details?id=com.urbanclap.provider&hl=en_US); [partner.urbancompany.com](https://partner.urbancompany.com/); [Postcoder — postcode lookup UX](https://postcoder.com/blog/postcode-lookup-ux); [Clagnut — the postcode lookup pattern](https://clagnut.com/blog/2292); [Econsultancy — postcode validation UX requirements](https://econsultancy.com/seven-important-ux-requirements-for-online-postcode-validation/); [Red Technology — making sense of VAT in ecommerce](https://www.redtechnology.com/news-and-insights/UX-Lab-making-sense-of-VAT-in-ecommerce/).*
