# Admin Redesign — Grok run prompt

Paste-ready task for the Grok Build CLI. Full spec: [`admin-design-plan.md`](./admin-design-plan.md).
This prompt points Grok at the spec and pins the guardrails inline so they hold even if the file is skimmed.

---

## Master prompt (paste once)

```
Redesign the Urban Assist admin dashboard (apps/admin only). Read docs/admin-design-plan.md first — it is the full spec. Theme: bento grid + minimalism + warm-light only, NO dark colors.

NON-NEGOTIABLE RULES:
1. TOKENS ONLY — every color from the existing preset (packages/ui/tailwind-preset.js + packages/ui/src/globals.css): bg (Warm Stone), ink (Slate Navy), muted, hairline, accent (Terracotta), accent-hover, success (Sage), danger (Rust). No raw hex. No dark surfaces anywhere.
2. Admin pages are async Next.js SERVER components using requireAdminPermission + inline server actions. Redesign = MARKUP + TAILWIND CLASSES ONLY. Do NOT convert server→client components. Do NOT touch data fetching, server actions, or append_admin_action_log audit calls.
3. No new dependencies. Tailwind + tokens + lucide-react only. Dashboard sparklines = CSS bars, no chart lib.
4. Additive only — never rename/remove tokens or shared packages/ui classes. If you add the optional surface-sunk gutter token, add it additively to the preset + globals.css.
5. Minimalism = whitespace + few borders + ONE accent per board. Not cramming. Max one accent tile per board.

DO NOT MODIFY: supabase/migrations, packages/domain, apps/customer, apps/provider. apps/admin only.
DO NOT RUN: supabase / db reset (Docker unavailable).

WORK IN THIS ORDER, commit after each step, and run `pnpm --filter @urban-assist/admin typecheck` after every page:
1. Shared primitives: BentoTile, StatTile, StatusChip, TableTile (in apps/admin/components or packages/ui).
2. Shell: apps/admin/app/(app)/layout.tsx + nav-links.tsx — group nav into sections (Operations / People / Commerce / Insight / Support), add the sunk page gutter so white tiles pop.
3. Dashboard bento (/ and /dashboard): hero tile + 4 metric tiles + wide exceptions tile + activity rail.
4. Analytics: pure stat-tile bento, one accent tile for GMV.
5. List pages → single grouped table-tiles (divide-y): bookings, customers, providers, promotions, services.
6. Detail pages → bento: booking, provider, customer (+wallet tile).
7. Forms polish: pricing, promotions, wallet grant.
8. Sweep: audit, ratings, scheduling, tickets.

ACCEPTANCE per page: typecheck green, no raw hex, no dark surface, one primary action, ≤1 accent tile per board, tables scroll internally (overflow-x-auto), focus rings intact. Run the admin production build at the end.
```

---

## Phase-by-phase (safer alternative)

Run one Grok invocation per step. Paste the **NON-NEGOTIABLE RULES** + **DO NOT MODIFY / DO NOT RUN** blocks above, then a single step, e.g.:

> Do step 1: shared primitives (BentoTile, StatTile, StatusChip, TableTile).

Then step 2, step 3, … verifying `pnpm --filter @urban-assist/admin typecheck` between each.

---

## Post-run checklist (for Claude)

After Grok finishes each batch:

- Review the diff (design = markup/classes only; confirm no server→client conversions, no touched server actions/audit calls, no edits outside apps/admin + packages/ui).
- `pnpm --filter @urban-assist/admin typecheck` + admin production build.
- No new migrations expected (redesign is UI-only). If Grok added a token, confirm it's additive in the preset + globals.css.
- Then resume SKU phases 3–5.
