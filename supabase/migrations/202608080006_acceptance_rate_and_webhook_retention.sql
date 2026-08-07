-- Two remaining follow-ups from the PR #5/#6 reviews.
--
-- 1. Providers were penalised for the overlap guard working. recompute_acceptance
--    (0003_triggers.sql:42) puts every 'accepted', 'declined' and 'expired' offer in the
--    denominator and only 'accepted' in the numerator. When claim_booking_for_provider
--    rejects an accept with provider_schedule_conflict, the offer is now declined with
--    decline_reason = 'schedule_conflict' so the booking re-dispatches immediately -- but
--    counting that against acceptance_rate would punish the provider for a collision the
--    platform detected on their behalf. Same for offers the system expires on their behalf
--    ('cascade_expired').
--
-- 2. stripe_webhook_events (202608070002) grows one row per lifetime Stripe event with
--    nothing pruning it. The dedupe window only needs to outlive Stripe's retry schedule
--    (~3 days), so 90 days is generous.

-- ---------------------------------------------------------------------------
-- 1. System-attributed declines stop counting against acceptance_rate
-- ---------------------------------------------------------------------------

-- Reasons the provider did not choose. Excluded from BOTH sides of the ratio, so they are
-- neutral rather than merely non-penalising.
--
--   schedule_conflict  the provider DID accept; the overlap guard rejected it.
--   taken_by_other     the provider DID accept; another provider had already won.
--
-- Plain 'expired' with no reason is deliberately NOT here: that means the provider let the
-- offer lapse without responding, which is genuinely their acceptance behaviour.
-- Returns FALSE for null, never null. `p_reason in (...)` yields NULL when p_reason is
-- null, and the callers below negate it — `not null` is null, so a null decline_reason
-- (which every accepted offer has) would drop out of the WHERE clause entirely, leaving
-- count(*) = 0 and pinning every provider's acceptance_rate at the 1.0 fallback.
create or replace function public.is_system_decline_reason(p_reason text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_reason in ('schedule_conflict', 'taken_by_other'), false);
$$;

-- Body from 0003_triggers.sql:42 (the only prior definition). Change is the
-- is_system_decline_reason filter and explicit schema qualification.
create or replace function public.recompute_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare a numeric;
begin
  if new.status in ('accepted', 'declined', 'expired') then
    select coalesce(
             sum(case when o.status = 'accepted' then 1 else 0 end)::numeric
             / nullif(count(*), 0), 1.0)
      into a
      from public.booking_offers o
     where o.provider_id = new.provider_id
       and o.offered_at > now() - interval '30 days'
       and not public.is_system_decline_reason(o.decline_reason);
    update public.profiles set acceptance_rate = coalesce(a, 1.0) where id = new.provider_id;
  end if;
  return new;
end;
$$;

-- Trigger already exists from 0003 and points at the function by name, so replacing the
-- body is enough. Recreated defensively in case an environment lost it.
drop trigger if exists offers_recompute_acceptance on public.booking_offers;
create trigger offers_recompute_acceptance
after update on public.booking_offers
for each row execute function public.recompute_acceptance();

-- Recompute every provider's rate once, so existing schedule_conflict declines stop
-- counting immediately rather than only after their next offer response.
update public.profiles p
set acceptance_rate = coalesce((
  select coalesce(
           sum(case when o.status = 'accepted' then 1 else 0 end)::numeric
           / nullif(count(*), 0), 1.0)
  from public.booking_offers o
  where o.provider_id = p.id
    and o.offered_at > now() - interval '30 days'
    and not public.is_system_decline_reason(o.decline_reason)
), 1.0)
where p.role = 'provider';

-- ---------------------------------------------------------------------------
-- 2. Retention for the webhook dedupe table
-- ---------------------------------------------------------------------------

create or replace function public.prune_stripe_webhook_events()
returns void
language sql
security definer
set search_path = ''
as $$
  -- Only processed rows are pruned. An unprocessed claim older than 90 days would mean a
  -- permanently stuck event, and deleting it would silently make it replayable rather than
  -- surfacing the problem.
  delete from public.stripe_webhook_events
  where processed_at is not null
    and received_at < now() - interval '90 days';
$$;

revoke all on function public.prune_stripe_webhook_events() from public, anon, authenticated;
grant execute on function public.prune_stripe_webhook_events() to service_role;

-- pg_cron is already used for the notification and cascade ticks (202607220004).
do $$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('prune-stripe-webhook-events')
    where exists (select 1 from cron.job where jobname = 'prune-stripe-webhook-events');

    perform cron.schedule(
      'prune-stripe-webhook-events',
      '17 4 * * *',
      $job$select public.prune_stripe_webhook_events();$job$
    );
  else
    raise warning 'pg_cron not installed; stripe_webhook_events retention not scheduled';
  end if;
end;
$$;
