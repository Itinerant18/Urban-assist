-- Make stripe_webhook_events record COMPLETION, not just receipt.
--
-- 202608070002 gave the table only (event_id, type, received_at), and the handler
-- treated "row exists" as "already processed". That loses events: if the function is
-- killed between the claim insert and the handler finishing (Vercel duration limit,
-- OOM, instance recycled mid-deploy), the claim row survives, every Stripe retry sees
-- it and returns 200, and Stripe stops retrying after ~3 days. The card stays charged
-- while payments.status sits at 'pending' forever, with nothing logged.
--
-- The mirror failure was the compensating delete: a retry that overlapped an in-flight
-- attempt got a 200 (so Stripe recorded success), then the first attempt failed and
-- deleted the claim -- work never done, and no retry coming.
--
-- With processed_at, a claim is self-healing: dedupe only on processed_at is not null,
-- and an unfinished claim older than the takeover window becomes retryable. The handler
-- no longer deletes anything.

alter table public.stripe_webhook_events
  add column if not exists processed_at timestamptz;

-- Backfill: rows written under the old flow only survived when the handler completed
-- (failures deleted their row), so an existing row means processed.
update public.stripe_webhook_events
  set processed_at = received_at
  where processed_at is null;

-- Supports the stale-claim lookup without scanning processed history.
create index if not exists stripe_webhook_events_unprocessed_idx
  on public.stripe_webhook_events (received_at)
  where processed_at is null;
