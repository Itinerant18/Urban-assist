-- Follow-up to 202608080003/4, from code review of PR #6.
--
-- 1. A duration of 0 silently disabled the entire overlap guard. tstzrange(x, x) is the
--    EMPTY range and `&&` is never true for it, so a zero-duration booking conflicted
--    with nothing -- neither provider_has_conflicting_booking nor the GiST exclusion
--    constraint. Zero was reachable: the admin SKU form does
--    `formData.get('duration') ? Number(...) : null`, and the string "0" is truthy, so
--    Number("0") === 0 passed straight through with no CHECK anywhere in the schema.
--    A negative duration was worse -- tstzrange(lower > upper) raises inside the index
--    expression, which would break get_assignment_candidates for that provider entirely.
--
-- 2. Holds were write-only. Nothing could clear one, so a dispute the platform WON left
--    the provider unpayable forever with direct SQL as the only remedy.
--
-- 3. held_pence double-counted money already transferred, because only ready_pence and
--    failed_pence were given a held filter. Chargebacks typically arrive after payout, so
--    that was the common case, and release_status reported "On hold" for money already
--    gone.
--
-- 4. Availability and time-off were still start-time-only, so a 4-hour job starting at
--    16:00 counted as available against a 09:00-17:00 shift.

-- ---------------------------------------------------------------------------
-- 1. Positive durations, enforced
-- ---------------------------------------------------------------------------

-- Clamp any existing non-positive values before constraining, so the migration cannot
-- fail on legacy data.
update public.bookings set duration_mins = 60 where duration_mins is null or duration_mins < 1;
update public.provider_services set duration_mins = 60 where duration_mins is null or duration_mins < 1;
update public.service_skus set duration_mins = null where duration_mins is not null and duration_mins < 1;

alter table public.bookings drop constraint if exists bookings_duration_positive;
alter table public.bookings add constraint bookings_duration_positive check (duration_mins > 0);

alter table public.provider_services drop constraint if exists provider_services_duration_positive;
alter table public.provider_services add constraint provider_services_duration_positive check (duration_mins > 0);

alter table public.service_skus drop constraint if exists service_skus_duration_positive;
alter table public.service_skus add constraint service_skus_duration_positive
  check (duration_mins is null or duration_mins > 0);

-- Trigger hardening: clamp to at least 1 minute, and resolve the duration from the SKU the
-- booking was actually made against (bookings.service_sku_id) before falling back to the
-- provider_service's current SKU. The old version keyed only off provider_service_id,
-- which is nullable -- those rows were stranded at 60 -- and followed the provider_service
-- to whatever SKU it points at *now*, so a catalog repoint silently changed the duration
-- of an existing booking.
create or replace function public.bookings_fill_duration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resolved integer;
begin
  if new.duration_mins is null or new.duration_mins = 60 then
    select coalesce(sku_direct.duration_mins, sku_via_service.duration_mins, ps.duration_mins, 60)
    into v_resolved
    from (select 1) _
    left join public.service_skus sku_direct on sku_direct.id = new.service_sku_id
    left join public.provider_services ps on ps.id = new.provider_service_id
    left join public.service_skus sku_via_service on sku_via_service.id = ps.sku_id;

    new.duration_mins := coalesce(v_resolved, 60);
  end if;

  -- Never let a zero or negative duration through: it would produce an empty tstzrange
  -- (conflicts with nothing) or raise inside the exclusion constraint's index expression.
  new.duration_mins := greatest(new.duration_mins, 1);

  new.ends_at := new.scheduled_at + make_interval(mins => new.duration_mins);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Releasing a hold
-- ---------------------------------------------------------------------------

create or replace function public.clear_booking_payout_hold(
  p_booking_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings
  set payout_held_at = null,
      payout_hold_reason = null
  where id = p_booking_id
    and payout_held_at is not null;

  if found then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, new_data)
    values (
      null,
      'payout.hold_cleared',
      'booking',
      p_booking_id,
      jsonb_build_object('reason', coalesce(p_reason, 'unspecified'))
    );
  end if;
end;
$$;

revoke all on function public.clear_booking_payout_hold(uuid, text) from public;
grant execute on function public.clear_booking_payout_hold(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. held_pence must not double-count transferred money
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_financial_dashboard()
returns jsonb
language sql
security definer
set search_path = ''
as $$
with latest_succeeded_payments as (
  select distinct on (pay.booking_id)
    pay.booking_id,
    pay.amount_pence,
    pay.vat_pence,
    pay.method
  from public.payments pay
  where pay.status = 'succeeded'
  order by pay.booking_id, pay.created_at desc, pay.id desc
),
booking_financials as (
  select
    b.id,
    b.provider_id,
    b.price_pence,
    -- Transfers are commission-net; every payable/ready figure must match.
    (b.price_pence - round(b.price_pence * public.commission_bps(b.category_id) / 10000.0)::integer) as net_pence,
    b.status,
    b.payout_held_at,
    lp.method as payment_method,
    po.status as payout_status,
    po.amount_pence as payout_amount_pence,
    po.lease_expires_at,
    po.failure_reason,
    profile.full_name,
    profile.stripe_account_id
  from public.bookings b
  join latest_succeeded_payments lp on lp.booking_id = b.id
  left join public.payouts po on po.booking_id = b.id
  left join public.profiles profile on profile.id = b.provider_id
),
eligible as (
  select *
  from booking_financials
  where status = 'completed' and provider_id is not null
    and payment_method = 'card'
),
provider_summary as (
  select
    provider_id,
    max(full_name) as full_name,
    max(stripe_account_id) as stripe_account_id,
    count(*)::integer as eligible_booking_count,
    coalesce(sum(net_pence), 0)::bigint as provider_payable_pence,
    coalesce(sum(case
      when payout_held_at is null
        and (payout_status is null
          or (payout_status = 'pending' and (lease_expires_at is null or lease_expires_at <= now())))
      then net_pence else 0 end), 0)::bigint as ready_pence,
    coalesce(sum(case
      when payout_status = 'pending' and lease_expires_at > now()
      then payout_amount_pence else 0 end), 0)::bigint as processing_pence,
    coalesce(sum(case when payout_status = 'paid' then payout_amount_pence else 0 end), 0)::bigint as paid_pence,
    coalesce(sum(case when payout_held_at is null and payout_status = 'failed' then payout_amount_pence else 0 end), 0)::bigint as failed_pence,
    -- Held money is only money still holdable. A chargeback usually arrives after the
    -- transfer, and counting an already-paid booking as held both double-counted it
    -- against paid_pence and told the admin it was "On hold" when the funds had gone.
    -- payout_status is an enum, so it must be compared null-safely rather than via
    -- coalesce(..., '') — an empty string is not a valid payout_status value.
    coalesce(sum(case
      when payout_held_at is not null and (payout_status is null or payout_status <> 'paid')
      then coalesce(payout_amount_pence, net_pence) else 0 end), 0)::bigint as held_pence,
    max(failure_reason) filter (where payout_status = 'failed') as last_failure_reason
  from eligible
  group by provider_id
),
metrics as (
  select
    coalesce((select sum(amount_pence) from latest_succeeded_payments), 0)::bigint as gross_processed_pence,
    coalesce((select sum(vat_pence) from latest_succeeded_payments), 0)::bigint as vat_collected_pence,
    coalesce((select sum(greatest(lp.amount_pence - b.price_pence - lp.vat_pence, 0))
      from public.bookings b
      join latest_succeeded_payments lp on lp.booking_id = b.id), 0)::bigint as platform_revenue_pence,
    coalesce((select sum(net_pence) from eligible), 0)::bigint as provider_payable_pence,
    coalesce((select sum(ready_pence) from provider_summary), 0)::bigint as ready_pence,
    coalesce((select sum(processing_pence) from provider_summary), 0)::bigint as processing_pence,
    coalesce((select sum(paid_pence) from provider_summary), 0)::bigint as paid_pence,
    coalesce((select sum(failed_pence) from provider_summary), 0)::bigint as failed_pence,
    coalesce((select sum(held_pence) from provider_summary), 0)::bigint as held_pence,
    coalesce((select sum(ready_pence) + sum(failed_pence) from provider_summary), 0)::bigint as releasable_pence
)
select jsonb_build_object(
  'metrics', jsonb_build_object(
    'gross_processed_pence', metrics.gross_processed_pence,
    'vat_collected_pence', metrics.vat_collected_pence,
    'platform_revenue_pence', metrics.platform_revenue_pence,
    'provider_payable_pence', metrics.provider_payable_pence,
    'pending_pence', metrics.ready_pence,
    'ready_pence', metrics.ready_pence,
    'processing_pence', metrics.processing_pence,
    'paid_pence', metrics.paid_pence,
    'failed_pence', metrics.failed_pence,
    'held_pence', metrics.held_pence,
    'releasable_pence', metrics.releasable_pence
  ),
  'providers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'provider_id', provider_id,
      'full_name', coalesce(full_name, 'Unnamed Provider'),
      'stripe_account_id', stripe_account_id,
      'eligible_booking_count', eligible_booking_count,
      'provider_payable_pence', provider_payable_pence,
      'ready_pence', ready_pence,
      'processing_pence', processing_pence,
      'paid_pence', paid_pence,
      'failed_pence', failed_pence,
      'held_pence', held_pence,
      'releasable_pence', ready_pence + failed_pence,
      -- 'paid' ahead of 'held': a provider whose money has already been transferred is
      -- paid, whatever hold was recorded afterwards.
      'release_status', case
        when ready_pence > 0 then 'ready'
        when processing_pence > 0 then 'processing'
        when failed_pence > 0 then 'failed'
        when paid_pence > 0 then 'paid'
        when held_pence > 0 then 'held'
        else 'paid'
      end,
      'last_failure_reason', last_failure_reason
    ) order by (ready_pence + failed_pence) desc, full_name asc)
    from provider_summary
  ), '[]'::jsonb)
)
from metrics;
$$;

-- ---------------------------------------------------------------------------
-- 4. Availability and time-off become duration-aware too
-- ---------------------------------------------------------------------------
-- Body from 202608080003 (11 output columns, training_eligible intact, conflict check via
-- provider_has_conflicting_booking). Changes: the availability slot must contain the whole
-- job, and time-off is compared as a date range against the job's span.
create or replace function public.get_assignment_candidates(p_booking_id uuid)
returns table (
  provider_id uuid,
  full_name text,
  email text,
  rating numeric,
  completed_jobs bigint,
  cancellation_rate numeric,
  last_seen_at timestamptz,
  earnings_pence bigint,
  is_available boolean,
  is_preferred boolean,
  training_eligible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select
      b.id,
      b.category_id,
      b.scheduled_at,
      b.ends_at,
      b.preferred_provider_id,
      upper(replace(a.postcode, ' ', '')) as postcode
    from public.bookings b
    join public.addresses a on a.id = b.address_id
    where b.id = p_booking_id
  ), provider_metrics as (
    select
      b.provider_id,
      count(*) filter (where b.status = 'completed') as completed_jobs,
      count(*) filter (where b.status = 'cancelled') as cancelled_jobs,
      count(*) filter (where b.status in ('completed', 'cancelled')) as terminal_jobs,
      coalesce(sum(b.total_pence) filter (where b.status = 'completed'), 0)::bigint as earnings_pence
    from public.bookings b
    where b.provider_id is not null
    group by b.provider_id
  )
  select distinct
    p.id,
    p.full_name,
    p.email,
    coalesce(p.rating_avg, 0)::numeric as rating,
    coalesce(pm.completed_jobs, 0) as completed_jobs,
    case when coalesce(pm.terminal_jobs, 0) = 0 then 0
      else round((pm.cancelled_jobs::numeric / pm.terminal_jobs::numeric) * 100, 2)
    end as cancellation_rate,
    p.last_seen_at,
    coalesce(pm.earnings_pence, 0),
    exists (
      select 1
      from public.availability_slots av
      where av.provider_id = p.id
        and av.weekday = (extract(isodow from t.scheduled_at)::integer - 1)
        and t.scheduled_at::time between av.start_time and av.end_time
        -- The whole job must fit inside the declared shift, not just its start. A job
        -- crossing midnight can never fit a single weekday slot, so requiring the same
        -- date also excludes it -- deliberately conservative.
        and t.ends_at::date = t.scheduled_at::date
        and t.ends_at::time <= av.end_time
    )
    and not exists (
      select 1
      from public.time_off off_period
      where off_period.provider_id = p.id
        -- Date-range overlap against the job's whole span, so a job running into a
        -- time-off day is excluded.
        and off_period.start_date <= t.ends_at::date
        and off_period.end_date >= t.scheduled_at::date
    )
    and not public.provider_has_conflicting_booking(p.id, t.scheduled_at, t.ends_at, t.id) as is_available,
    (t.preferred_provider_id is not null and p.id = t.preferred_provider_id) as is_preferred,
    (
      not exists (
        select 1 from public.training_items ti
        where ti.category_id = t.category_id
          and ti.is_active
          and ti.gates_category
      )
      or not exists (
        select 1 from public.training_items ti
        where ti.category_id = t.category_id
          and ti.is_active
          and ti.gates_category
          and not exists (
            select 1 from public.provider_training_completions ptc
            where ptc.provider_id = p.id
              and ptc.item_id = ti.id
              and (
                ti.pass_score is null
                or (ptc.score is not null and ptc.score >= ti.pass_score)
              )
          )
      )
    ) as training_eligible
  from target t
  join public.provider_services ps
    on ps.category_id = t.category_id and ps.is_active
  join public.profiles p
    on p.id = ps.provider_id
   and p.role = 'provider'
   and p.kyc_status = 'approved'
   and p.registration_completed
   and not p.is_blocked
  join public.provider_service_areas psa
    on psa.provider_id = p.id
   and (psa.category_id is null or psa.category_id = t.category_id)
   and t.postcode like upper(replace(psa.postcode_pattern, ' ', '')) || '%'
  left join provider_metrics pm on pm.provider_id = p.id
  order by
    training_eligible desc,
    (t.preferred_provider_id is not null and p.id = t.preferred_provider_id) desc,
    is_available desc,
    rating desc,
    completed_jobs desc,
    p.id;
$$;

revoke all on function public.get_assignment_candidates(uuid) from public;
grant execute on function public.get_assignment_candidates(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. One payment per Stripe intent
-- ---------------------------------------------------------------------------
-- resolveBookingId in the webhook uses .maybeSingle() on this column, so a duplicate would
-- put the hold path into a permanent retry loop. Conditional because legacy duplicates
-- would otherwise fail the deploy.
do $$
declare
  v_dupes integer;
begin
  select count(*) into v_dupes from (
    select stripe_payment_intent_id
    from public.payments
    where stripe_payment_intent_id is not null
    group by stripe_payment_intent_id
    having count(*) > 1
  ) d;

  if v_dupes > 0 then
    raise warning 'payments_stripe_intent_uniq NOT created: % duplicated intent id(s).', v_dupes;
    return;
  end if;

  create unique index if not exists payments_stripe_intent_uniq
    on public.payments (stripe_payment_intent_id)
    where stripe_payment_intent_id is not null;
end;
$$;
