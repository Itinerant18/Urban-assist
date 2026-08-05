# @urban-assist/ui

Design tokens, primitives and the app shell. Every app config is a six-line
wrapper around `@urban-assist/ui/tailwind-preset`; add tokens here, never in an
app.

## Usage rules

These are enforced in review. Each one exists because breaking it shipped a real
defect.

### Colour

- `accent`, `success`, `amber` are fills, borders, and text at **≥18px bold**
  only. Below that use `accent-deep` / `success-deep` / `amber-deep`, which clear
  4.5:1 on white and on `bg` at any size. `text-success` at 12px is 3.64:1.
- `text-hairline` is never a text colour. It is a border token (1.24:1).
- Never signal a state with colour alone. A disabled slot needs the word
  "Passed", not just a strike-through.

### Type

- Floor is **11px** (`text-[11px]`); prefer 12px. `text-[9px]` and `text-[10px]`
  are banned.
- Scale: 11px meta · 12–13px secondary · 14px body (`text-sm`) · 16px emphasised
  (`text-base`) · 18–20px section titles · 24px page titles (`text-2xl`) · 30px+
  display.
- Weights: 400 body, 500 UI, 600–700 headings, 800 display only.
- Families come from `next/font` via `--font-sans` / `--font-mono`, set in each
  app's root layout. Do not add a `<link>` to fonts.googleapis.com.

### Shape and elevation

- `rounded-xl` (14px) by default; `rounded-2xl` (18px) for hero cards only. No
  `rounded-3xl`, no arbitrary radii.
- `shadow-card` / `shadow-hero` only. Stock `shadow-sm|md|lg|xl` are off-menu.

### Targets and safe areas

- Every interactive element carries `.tap` (48px) or an explicit ≥44px size.
- Sticky bottom elements use `.above-tabbar` where a tab bar is visible, and
  `.safe-pb` where it is not. `--tabbar-clearance` is the single source for tab
  bar height — do not hardcode `3rem`.
- Headers pad with `env(safe-area-inset-top)`.

### Motion

- `duration-fast` (150ms) for taps, hovers, toggles; `duration-base` (250ms) for
  sheets and drawers. Motion conveys state, never decoration.
- `prefers-reduced-motion` is handled globally in `globals.css`.

**Layering** — use the named z-index tokens, not numbers: `z-tabbar` (40),
`z-sticky` (45), `z-header` (50), `z-sheet` / `z-modal` (60), `z-toast` (70).

## Primitives

| Component | Use it for |
| --- | --- |
| `Dialog` | Confirmations and short decisions. Native `<dialog>`: focus trap, Esc and inert background come free. |
| `BottomSheet` | Pickers, filters, breakdowns. Sheet under `lg`, centred dialog above. |
| `useConfirm()` | Promise-based confirmation. Replaces `window.confirm`. |
| `Toast` / `toast()` | Transient feedback. Mount `<Toaster />` once per app. Replaces `alert()`. |
| `Spinner` | Button-busy states. Content areas use `Skeleton`. |
| `Skeleton` / `PageSkeleton` | Route-level loading, shaped like the content that follows. |
| `EmptyState` | There is genuinely nothing here. |
| `ErrorState` | We could not load it. **Never** substitute `EmptyState` — a failed fetch and an empty list are different facts. |
| `PriceSummary` | The one price breakdown: aside, mobile sheet, invoice. |
| `AppShell` | Bottom tabs on mobile, sidebar on desktop. Give every non-tab route an owning tab via `NavItem.match`. |
| `ServiceWorkerRegistrar` | Registers `/sw.js` so the PWA is installable. |

Booking-status labels and tones live in `@urban-assist/domain/job-status`
(`bookingStatusLabel` / `bookingStatusTone`) — one vocabulary for customer,
provider and admin.

## Non-goals

**Dark mode.** One light theme only: no paired tokens, no `dark:` variants, no
toggle.
