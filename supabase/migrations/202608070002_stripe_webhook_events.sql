-- Stripe webhook idempotency.
--
-- apps/customer/app/api/stripe/webhook/route.ts verifies signatures but had no
-- event dedupe, so a Stripe retry or a replay from the dashboard re-ran every
-- side effect. The payments UPDATE happened to be idempotent, but track() was
-- not -- each replay appended another analytics_events row.
--
-- The handler claims an event by inserting its id here first. A unique violation
-- means the event was already processed, and the handler returns 200 without
-- doing the work again.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_received_idx
  on public.stripe_webhook_events (received_at desc);

alter table public.stripe_webhook_events enable row level security;
-- Service-role only: the webhook route is the sole writer and nothing in the
-- client apps reads this. No authenticated policy = no client access, matching
-- the pattern used by commission_rules (202607210006) and pricing_modifiers
-- (202608030007).
