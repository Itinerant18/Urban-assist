# SKU Hierarchy — Phases 3–5 Implementation Plan

Continues the SKU build. Phases 1–2 are done and live:

- **P1** (`790107e`): tables `service_subcategories` / `service_skus` / `service_attributes` seeded (48 subs, 146 SKUs) + nullable `bookings.service_sku_id` and `provider_services.sku_id`.
- **P2** (`abb4b3c`): admin `/services` catalog CRUD.

## Current model (verified)

- Providers create rows in **`provider_services`** by picking a `category_id`, a freetext `title`, `price_pence`, `duration_mins`. Price is validated against the category's `min/max_price_pence` band. Source: `apps/provider/app/onboarding/services/services-editor.tsx`, `apps/provider/app/(app)/services/page.tsx`.
- Customers **browse** a static taxonomy (`apps/customer/lib/services-data.ts`) across ~11 files, then **book a specific `provider_service`**: `/book/[serviceId]` where `serviceId` = `provider_services.id` (`apps/customer/app/services/[category]/provider-list.tsx` → `createBooking`).
- The static catalog and `provider_services` are linked only by `category`. **No SKU is referenced anywhere yet** — P1 columns are dormant.

## The through-line

`service_skus` (catalog) → **`provider_services.sku_id`** (P4: provider picks a SKU) → **`bookings.service_sku_id`** (P5: copied at booking time). Phase 3 (customer browse from DB) is a read-source swap that's independent of 4/5.

## Non-negotiable guarantee (all phases)

**Additive + backward-compatible.** `provider_services.sku_id` and `bookings.service_sku_id` stay nullable. Existing rows (null sku) keep working on the category path. Nothing here changes pricing math, the matching engine, or payout — SKU is an added dimension, not a replacement. No new migration is needed (P1 already added the columns). Rollback = stop reading the columns.

---

## Phase 0 — Pre-flight (before any P3–P5 work)

The Grok redesign touched `apps/admin` (pages now import `@/components/bento`). Verify + lock it first:

- `pnpm --filter @urban-assist/admin typecheck` and admin production build — must be green.
- Confirm the redesign is committed; review the diff is markup-only (no server→client conversions, server actions + `append_admin_action_log` intact, nothing outside `apps/admin` + `packages/ui`).
- Only then start P4.

---

## Phase 4 — Provider offers reference SKUs  *(do first: small, completes the data model)*

**Goal:** when a provider adds a service, they pick a **SKU** (category → subcategory → SKU) instead of typing a freetext title; store `provider_services.sku_id`. Title/price band derive from the SKU.

**Files:** `apps/provider/app/onboarding/services/services-editor.tsx` (client, main), `apps/provider/app/(app)/services/page.tsx` (list + data), `apps/provider/app/onboarding/services/page.tsx` (server data fetch).

**Approach:**

1. Server pages fetch the catalog tree: `service_subcategories` + `service_skus` (joined to categories) alongside the existing `service_categories`, pass to the editor.
2. Editor: replace the freetext `title` input with a cascading select — Category → Subcategory → SKU. On SKU select: prefill `title` from `sku.name`, and validate `price_pence` against **`sku.min/max_price_pence`** (tighter than the category band; fall back to category band if no SKU).
3. Insert/update `provider_services` with `sku_id` set (plus existing `category_id` — keep it, derive from the SKU's subcategory→category so old queries still work).
4. Provider `/services` list: show the SKU name (join `service_skus`).

**Backward-compat:** existing `provider_services` have `sku_id = null` → editor still renders them (category + title), still bookable. New ones carry `sku_id`. Category-based matching untouched.

**Verify:** provider adds a service via SKU picker → row has `sku_id`; typecheck `@urban-assist/provider`; a live REST check that a new `provider_services` row carries the chosen `sku_id`.

---

## Phase 5 — Booking captures the SKU  *(trivial once P4 lands)*

**Goal:** populate `bookings.service_sku_id` when a `provider_service` that has a `sku_id` is booked.

**Files:** `packages/domain/src/bookings/services/booking-service.ts` (`createBooking`).

**Approach:**

1. In `createBooking`, add `sku_id` to the `provider_services` select (currently selects `id, provider_id, category_id, price_pence`).
2. Set `service_sku_id: svc.sku_id ?? null` in the `bookings.insert`.
3. That's it — no schema change, no pricing change.

**Optional (nice-to-have, defer unless asked):** surface the SKU name on the admin booking detail and the customer booking confirmation (join `service_skus`).

**Backward-compat:** provider_services with null sku_id → booking.service_sku_id stays null (as today). No backfill of historical bookings (YAGNI).

**Verify:** create a booking (card + cash) against a provider_service that has a sku_id → confirm `bookings.service_sku_id` is set; against one without → stays null. Re-run the wallet/promo booking paths to confirm no regression (createBooking is the money path).

---

## Phase 3 — Customer browse reads the DB  *(do last: biggest, purely a read swap)*

**Goal:** the customer catalog (browse, category, subcategory, service pages) reads `service_subcategories` / `service_skus` from the DB instead of the static `services-data.ts`, so admin catalog edits show up live.

**Files (~11 consumers):** `apps/customer/app/services/catalog-client.tsx`, `services/[category]/page.tsx`, `services/[category]/[subcategory]/page.tsx` (+ `subcategory-client.tsx`), `services/[category]/[subcategory]/[service]/page.tsx`, `components/services/*` (category-section, category-tabs, service-card, service-search, subcategory-block), `lib/homepage-data.ts`, and `lib/services-data.ts` itself.

**Approach:**

1. Add a data-access module `apps/customer/lib/catalog.ts` that fetches the tree (categories → subcategories → skus) from Supabase and returns the **same shape** the components already expect (so component JSX barely changes).
2. Slugs match (the DB was seeded from `services-data.ts`), so **all existing URLs keep working** — verify slug parity as the first step.
3. Icons: `services-data.ts` carries lucide icon *names* as strings; those seeded into `subcategories.icon`. Keep the string→lucide map (`categoryIcons`) client-side; DB supplies the string.
4. Convert the static-consuming server pages to fetch from `catalog.ts`; keep `services-data.ts` temporarily as the icon-map home, then delete the data array once nothing imports it.
5. Prices: static services carry `minPricePence/maxPricePence` → now `service_skus.min/max_price_pence`.

**Risk:** slug drift (if catalog was edited in admin after seeding). Mitigation: verify parity first; 404s are the failure mode, caught by clicking through.

**Verify:** every catalog URL resolves; homepage sections render; search works; `@urban-assist/customer` typecheck + build.

---

## Recommended sequence & why

1. **Phase 0** — verify/lock the redesign.
2. **Phase 4** — provider SKU picker (small, real, completes the write side).
3. **Phase 5** — booking copies sku_id (≈3 lines; money-path, verify carefully).
4. **Phase 3** — customer browse from DB (biggest, independent, purely cosmetic upside: live-editable catalog).

4+5 first means the data model is fully wired (SKUs flow provider→booking) before spending effort on the browse swap. Each phase is independently shippable and reversible.

## Risk register

| Risk | Phase | Mitigation |
|---|---|---|
| Break live booking creation | 5 | Additive select + nullable insert; re-run wallet/promo paths; verify both sku/no-sku bookings |
| Price band mismatch (SKU tighter than category) | 4 | Validate vs SKU band when sku chosen, else category band; clear error copy |
| URL 404s after browse swap | 3 | Verify slug parity first; click-through every route |
| Existing provider_services with null sku_id | 4 | Keep category path; sku_id optional in UI and queries |
| Redesign regressions | 0 | typecheck + build gate before starting |

No new migrations. All rollbacks = stop reading the nullable columns.
