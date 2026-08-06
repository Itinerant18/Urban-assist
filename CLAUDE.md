# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                 # pnpm 9 workspace — never npm/yarn
pnpm dev:customer            # :3000   pnpm dev:provider → :3001   pnpm dev:admin → :3002
pnpm build | lint | typecheck   # runs -r across every app and package
pnpm test                    # vitest run (root vitest.config.mts covers the whole workspace)
pnpm test -- pricing         # single file/pattern
pnpm db:migrate              # supabase db push
pnpm db:types                # regenerate packages/db/src/types/generated.ts from local schema
```

Env: copy `.env.example` to `apps/<app>/.env` (or `.env.local`). Apps boot with only the Supabase keys set — Stripe/FCM/Redis degrade with console warnings rather than crashing.

Local auth testing without SMS charges: UK `7123456789` or IN `9876543210`, OTP always `123456`.

### Tests

Root [vitest.config.mts](vitest.config.mts) includes `packages/**/*.test.ts` and `apps/**/lib/*.test.ts` only — pure logic. Anything needing React rendering or a live client is deliberately uncovered. `*.db.test.ts` files hit a local Supabase (`supabase start`) and self-skip when it is unreachable; a skipped DB suite is not a passing one.

## Architecture

Three Next.js 14 App Router apps over one Supabase project. Apps hold routing, UI and API routes; everything reusable lives in `packages/*` and is imported by `workspace:*` under `@urban-assist/*`. Packages are consumed as **raw TypeScript source** (`main: ./src/index.ts`) — no build step, so a package edit is live in every app immediately, and subpath imports come from the explicit `exports` map in each package.json.

```text
apps/{customer,provider,admin}
  └─ @urban-assist/ui           design system + tailwind preset (no external deps)
     @urban-assist/db           Supabase client factories + generated types
     @urban-assist/domain       business logic (bookings, matching, pricing, training…)
     @urban-assist/integrations Stripe · Upstash Redis · Firebase FCM · postcode
     @urban-assist/utils        format/validate/constants   @urban-assist/types  shared contracts
```

### The three Supabase clients — pick deliberately

From `@urban-assist/db/server`:

- `getSupabaseServer()` — RSC / Server Action / Route Handler. Reads the auth cookie, **RLS applies**. This is the default.
- `createServiceRole()` — bypasses RLS. Only in trusted server code: webhooks, the matching engine, admin actions.
- `getSupabaseBrowser()` — client components.

Domain services commonly take **both** clients: the user-scoped one to enforce ownership and the service-role one for the cross-user writes RLS forbids (see `createBooking(getSupabaseServer(), createServiceRole(), …)` in [apps/customer/app/api/bookings/route.ts](apps/customer/app/api/bookings/route.ts)). Keep that split — don't collapse a route to service-role because a query was blocked; the block is usually the point.

### Auth & route protection

Each app's `middleware.ts` declares a `PROTECTED_PREFIXES` list and delegates to `updateSupabaseSession()` in [packages/db/src/middleware.ts](packages/db/src/middleware.ts), which refreshes the session cookie and optionally enforces `requireAdmin` (via the `is_admin_user` RPC) or `requireAal2` (MFA). Auth is OTP-only, no passwords. On the customer app, browse/discovery routes are intentionally *not* protected — gating them puts a login wall in front of the catalogue (see [apps/customer/PRODUCT.md](apps/customer/PRODUCT.md)).

### API route shape

`getUser()` → 401 · optional Redis rate limit → 429 · zod `safeParse` → 400 · call a domain function · `catch` → 400. Business rules belong in `packages/domain`, not in the route.

### Database

`supabase/migrations/` is append-only, `YYYYMMDDNNNN_description.sql`, ~66 files and counting. Never edit an applied migration — add a new one. RLS policies, triggers and functions live in migrations too, so a permissions change is a migration, not app code. `supabase/bootstrap.sql` is a combined snapshot for reference only. Edge Functions (`notification-dispatch`, `match-cascade`, `support-ticket-webhook`) are invoked from pg_cron via pg_net with a shared `EDGE_FUNCTION_SECRET` — see README for deploy and Vault setup.

After changing schema, run `pnpm db:types`; `packages/db/src/types/generated.ts` is generated, never hand-edited.

### Styling

Tailwind via the shared preset: each app's `tailwind.config.js` does `presets: [require('@urban-assist/ui/tailwind-preset')]` and includes `../../packages/ui/src/**` in `content`. Add design tokens to the preset, not to an app config. `docs/DESIGN-customer.md` and each app's `PRODUCT.md` define the visual and product intent.

### V1 scope caveats (UI must not promise more)

Provider assignment is **manual by admins** — the matching engine exists and scores candidates (50% proximity / 30% rating / 20% acceptance) but full automation is Phase 2. Stripe Connect payouts are stubbed. The customer "cart" holds exactly one pending service, not a multi-item basket.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; that is not a reason to skip graphify. Only skip it if the task is about stale or incorrect graph output, or the user says not to.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Skills & MCP

Project skills live in `.claude/skills/` (mirrored in `.cursor/skills/`); check for a matching SKILL.md before design, frontend, backend, architecture or review work.

MCP servers (supabase, sequential-thinking, serena, chrome-devtools, tavily, MCP_DOCKER) are declared per tool from one source list: `.mcp.json` (Claude Code), `.cursor/mcp.json`, `.vscode/mcp.json`, `.gemini/settings.json`, `opencode.json`, `.codex/config.toml`, `.antigravity/mcp_config.json`. Edit `.mcp.json` first, then regenerate the rest to match.

## Conventions worth keeping

`ponytail:` comments mark deliberate simplifications with a named ceiling and upgrade path — read one before "fixing" what it describes.
