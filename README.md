# Urban Assist

UK home services marketplace — connect customers with vetted professionals.  
Built as a **pnpm monorepo** with Next.js 14 · Supabase · Stripe · Upstash Redis · Firebase FCM.

---

## Directory Map

```
urban-assist/
├── apps/
│   ├── customer/        # Customer web app        → localhost:3000
│   ├── provider/        # Provider web app         → localhost:3001
│   └── admin/           # Admin panel              → localhost:3002
│
├── packages/
│   ├── ui/              # Shared design system (Tailwind tokens, components)
│   ├── db/              # Supabase typed client + generated DB types
│   ├── lib/             # Universal utilities (format, pricing, postcode)
│   ├── domain/          # Business logic (KYC, matching, analytics)
│   └── integrations/    # Stripe, Redis, Firebase and postcode adapters
│
├── supabase/
│   ├── migrations/      # Incremental SQL migrations (schema, RLS, seed)
│   ├── functions/       # Supabase Edge Functions
│   └── bootstrap.sql    # Full combined schema for reference
│
├── docs/                # PRDs, DB schema, implementation plan, flows
│
├── tsconfig.base.json   # Shared TypeScript compiler options
├── .eslintrc.js         # Monorepo-wide ESLint config
├── .prettierrc          # Shared Prettier config
├── .gitignore
├── .env.example         # Template — copy to each app's .env
├── pnpm-workspace.yaml
└── package.json         # Root scripts
```

---

## Apps

| App | Port | Who uses it | Purpose |
|---|---|---|---|
| `apps/customer` | **3000** | Customers | Discover services, book, track, pay, review |
| `apps/provider` | **3001** | Professionals | Onboarding, job offers, schedule, earnings |
| `apps/admin` | **3002** | Operations team | KYC review, booking oversight, support tickets |

## Shared Packages

| Package | Description |
|---|---|---|
| `@urban-assist/ui` | Design tokens (Tailwind preset), shared CSS variables, primitives (Button, Card, Badge), AppShell, LiveStatusTrack, Rating |
| `@urban-assist/db` | Supabase client factory (`getSupabaseServer`, `getSupabaseBrowser`, `createServiceRole`), generated DB types |
| `@urban-assist/lib` | Universal utilities — currency/date formatting, pricing/VAT, UK postcode lookup (safe for client & server) |
| `@urban-assist/domain` | Business logic — KYC, matching engine, analytics, bookings and admin services |
| `@urban-assist/integrations` | External adapters — Stripe payments, Upstash Redis, Firebase FCM and postcode lookup |

### Package Dependency Graph

```
apps/customer ──┐
apps/provider ──┼──→ @urban-assist/db       ──→ Supabase
apps/admin    ──┤──→ @urban-assist/lib      ──→ format · pricing · postcode
                │──→ @urban-assist/domain   ──→ KYC · matching · analytics
                │──→ @urban-assist/integrations ──→ Stripe · Redis · FCM
                └──→ @urban-assist/ui       ──→ design-only, no external deps
```

---

## Quick Start

```bash
# 1. Install all dependencies
pnpm install

# 2. Set up environment variables for each app
cp .env.example apps/customer/.env
cp .env.example apps/provider/.env
cp .env.example apps/admin/.env
# → Fill in your Supabase URL + keys (minimum required to boot)

# 3. Run the database migrations
pnpm db:migrate

# 4. Start the apps (pick what you need)
pnpm dev:customer    # http://localhost:3000
pnpm dev:provider    # http://localhost:3001
pnpm dev:admin       # http://localhost:3002
```

Apps boot with console warnings for any missing SDK keys — you can start with just Supabase keys and add Stripe/FCM/Redis later.

---

## Testing & Authentication

To log in or test the **Customer** and **Provider** apps without generating real SMS charges:

* **UK Test Number**: `+44 7123 456789` (Enter as country UK, number `7123456789`)
* **India Test Number**: `+91 98765 43210` (Enter as country India, number `9876543210`)
* **Fixed OTP Code**: `123456`

---

## Available Scripts

| Script | What it does |
|---|---|
| `pnpm dev:customer` | Start customer app in dev mode (port 3000) |
| `pnpm dev:provider` | Start provider app in dev mode (port 3001) |
| `pnpm dev:admin` | Start admin panel in dev mode (port 3002) |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |
| `pnpm typecheck` | Type-check all apps and packages |
| `pnpm db:types` | Regenerate TypeScript types from local Supabase schema |
| `pnpm db:migrate` | Push migrations to Supabase |

---

## Infrastructure Setup

### 1. Supabase (Required)

1. Create a project at [app.supabase.com](https://app.supabase.com)
2. Copy URL + anon key + service role key into each app's `.env`
3. Run `pnpm db:migrate` to apply the schema, RLS policies, triggers, and seed data

### 2. Stripe (Required for payments)

1. Get test keys from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to each app's `.env`
3. Configure a webhook endpoint pointing to `/api/stripe/webhook` on the customer app
4. Set `STRIPE_WEBHOOK_SECRET` from the webhook endpoint settings

### 3. Upstash Redis (Optional — rate limiting & caching)

1. Create a Redis database at [console.upstash.com](https://console.upstash.com)
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 4. Firebase (Optional — push notifications)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Cloud Messaging; get VAPID key from Web Push Certificates
3. Download service account JSON for server-side sending

### 5. Google Maps (Optional — address autocomplete & map views)

1. Enable Maps JavaScript API + Places API in [Google Cloud Console](https://console.cloud.google.com)
2. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## Key Technical Decisions

| Technology | Decision | Rationale |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR for SEO, shared components, built-in API routes as BFF |
| **Primary DB** | Supabase (PostgreSQL) | Relational integrity, built-in Auth, Row Level Security |
| **Real-time** | Supabase Realtime | Live booking status without Firebase dependency for MVP |
| **Payments** | Stripe | Global reach, strong webhook support, Connect for provider payouts |
| **Caching / Rate-limit** | Upstash Redis | Serverless-friendly, REST API, generous free tier |
| **Push notifications** | Firebase FCM | Cross-platform, reliable delivery |
| **Monorepo** | pnpm workspaces | Native workspace protocol, fast installs, no hoisting surprises |

---

## Notes vs. the Original Spec

* **Stripe Connect payouts deferred** — the `payouts` table exists and the earnings UI shows balances, but the actual onboarding/transfer flow is stubbed in `packages/lib/src/stripe/payouts.ts` with a clearly marked `TODO`.
* **Admin app** — scoped to KYC review queue + booking overview + support tickets for V1. Full assignment engine is manual via Supabase dashboard in Phase 1.
* **No Firebase Firestore** — real-time booking status uses Supabase Realtime instead, simplifying the stack while keeping the option open for Phase 2.

# Urban-assist

## Scheduled notification delivery

Notification delivery and stale-offer cascading require the two Edge Functions and a shared
scheduler secret:

```bash
supabase functions deploy notification-dispatch match-cascade --no-verify-jwt
supabase secrets set EDGE_FUNCTION_SECRET=<value>
```

Migration `202607220004_schedule_edge_dispatch.sql` reuses the `0022` pg_net configuration
pattern: set `app.settings.edge_function_url` on the `postgres` database to the project’s
`/functions/v1` base URL, then store the same `<value>` in Vault as `edge_function_secret`:

```sql
alter database postgres set app.settings.edge_function_url =
  'https://<project-ref>.supabase.co/functions/v1';
select vault.create_secret(
  '<value>', 'edge_function_secret', 'Bearer secret for scheduled Edge Functions'
);
```
