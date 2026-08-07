# Urban Company Mobile UI Teardown (2026-08-07)

Live captures of UC mweb at 390px (mirrors the app closely). Reference for the
Urban Assist mobile redesign. Palette is always ours (terracotta/amber/warm
stone); UC supplies structure and component anatomy only.

## Surfaces captured
- Home (`/kolkata`), category pages (`-ac-service-repair` AC, `-professional-home-cleaning`),
  deep scroll: service cards, FAQ, ratings histogram, rebooked strip, SEO prose.
- NOT reachable without an account: cart, checkout, bookings, account, chat.
  UC checkout knowledge is pattern-level only; our booking flow was verified
  against it separately and already matches (stepper, chip rail, sticky total).

## Component anatomy inventory → Urban Assist status

| UC component | Anatomy | UA status |
|---|---|---|
| Home category card | One white card, 3-col icon tiles, ETA/price chip per tile | SHIPPED `33c2baf` (£N+ chips) |
| Section heading | Big bold headline-case + "See all" pill right | SHIPPED |
| Most-booked row | Horizontal snap cards: image top, title, ★ rating (count), price | SHIPPED (dedupe by category) |
| Promo banner | Full-width tinted strip, code chip, CTA pill | SHIPPED (terracotta) |
| Category hero | Big category name, ★avg (bookings) dotted-underline, ETA chip, warranty banner | PARTIAL: ours has richer hero; warranty = chips |
| Select-a-service sheet | Small-caps label + hairline, 3-col image tiles in one card | SHIPPED `777eb9e` |
| Service card | Text left (title/★/price/strike/bullets), image right + Add | SHIPPED (mobile horizontal cards) |
| Sticky category sub-header | Appears after hero scrolls out | SHIPPED (IntersectionObserver) |
| Filter/sort pills | Sticky bar | SHIPPED (ours richer: price/sort/popular) |
| FAQ | Lean divide-y question rows, chevron, no icon boxes | RESTYLED this pass |
| **Ratings histogram** | Giant ★4.81 numeral, "258K reviews", 5→1 bars with per-star counts | **BUILT this pass** (real data only; hidden when no reviews) |
| Rebooked strip | Horizontal image cards + caption | ≈ trending row; skip |
| SEO prose block | H2 + paragraphs at page bottom | Skip (SEO work, not UI) |
| Sticky bottom cart bar | Item count + total + View cart | ≈ GlobalMobileCta + book-flow sticky bar; done |

## Hard rules carried through
- No invented numbers anywhere. UC shows "258K reviews" because they have them;
  UA aggregates real `reviews` rows and hides the block below a minimum.
- lucide-react stays (installed family); tokens frozen; Outfit everywhere.
- Product register: motion 150-250ms state-conveying only, no page-load choreography.
