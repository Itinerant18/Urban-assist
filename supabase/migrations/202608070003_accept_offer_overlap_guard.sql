-- Close the double-accept hole on the auto-match path.
--
-- respondToOffer (packages/domain/src/matching/services/matching-engine.ts)
-- re-checked training eligibility but never availability. Its Redis lock is keyed
-- per *offer*, so it does not serialise two different offers, and its compare-and-swap
-- (`provider_id is null`) only stops two providers taking one booking -- not one
-- provider taking two overlapping bookings. A provider holding two overlapping
-- offers could accept both.
--
-- The admin assign path (admin_assign_booking, 202607210002) was already correct:
-- per-provider advisory lock + the +/-60 minute busy window. This migration extracts
-- that busy window into one function so both paths share a single definition of
-- "busy", then adds a claim RPC that the accept path uses.

-- 1. The +/-60 minute busy window, extracted from the inline predicate in
--    get_assignment_candidates.
create or replace function public.provider_has_conflicting_booking(
  p_provider_id uuid,
  p_scheduled_at timestamptz,
  p_exclude_booking_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings busy
    where busy.provider_id = p_provider_id
      and busy.status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
      and (p_exclude_booking_id is null or busy.id <> p_exclude_booking_id)
      and busy.scheduled_at between p_scheduled_at - interval '60 minutes'
                                and p_scheduled_at + interval '60 minutes'
  );
$$;

revoke all on function public.provider_has_conflicting_booking(uuid, timestamptz, uuid) from public;
grant execute on function public.provider_has_conflicting_booking(uuid, timestamptz, uuid) to service_role;

-- 2. Repoint get_assignment_candidates at the extracted function.
--
--    IMPORTANT: this body is based on 202608030004_training_quizzes_gating.sql, which is
--    the migration that most recently defined this function -- NOT 202608030001, which
--    an earlier draft of this migration copied. 202608030004 added an 11th output column
--    (training_eligible) and a leading `order by training_eligible desc`. Rebuilding from
--    202608030001 would have silently dropped category training gating from admin
--    candidate selection; the only reason it did not ship is that `create or replace`
--    refused the column-count change with 42P13. If you edit this function again, diff
--    against the newest defining migration, not the first one you find.
--
--    Only the inline `not exists (... busy ...)` block is replaced, so candidate ranking
--    and every output column are otherwise unchanged.
--
--    Dropped first because the return type is unchanged only relative to 202608030004 --
--    keep the drop so a future column change cannot hit 42P13 here. Safe: the only
--    callers are plpgsql functions (admin_assign_booking, 202608030002), which resolve
--    the reference at runtime rather than parse time.
drop function if exists public.get_assignment_candidates(uuid);

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
    )
    and not exists (
      select 1
      from public.time_off off_period
      where off_period.provider_id = p.id
        and t.scheduled_at::date between off_period.start_date and off_period.end_date
    )
    and not public.provider_has_conflicting_booking(p.id, t.scheduled_at, t.id) as is_available,
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

-- 3. Atomic claim for the offer-accept path: advisory lock, overlap check, then the
--    same compare-and-swap the TypeScript previously did on its own.
--
--    Deliberately does NOT re-check availability_slots or time_off. The provider was
--    already sent this offer; rejecting an accept because they since edited their
--    declared hours would strand the booking. Only the overlap -- the actual defect --
--    is enforced here.
create or replace function public.claim_booking_for_provider(
  p_booking_id uuid,
  p_provider_id uuid
)
returns table (
  id uuid,
  customer_id uuid,
  provider_id uuid,
  status public.booking_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scheduled_at timestamptz;
begin
  -- Serialise every claim for this provider so two overlapping offers cannot both
  -- pass the conflict check below. Same lock key as admin_assign_booking.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_provider_id::text, 0));

  select b.scheduled_at into v_scheduled_at
  from public.bookings b
  where b.id = p_booking_id
    and b.provider_id is null
    and b.status in ('pending_match', 'unmatched')
  for update;

  -- Already claimed, cancelled, or otherwise not claimable. Return zero rows and
  -- let the caller expire the offer, matching the previous CAS-returned-null path.
  if v_scheduled_at is null then
    return;
  end if;

  if public.provider_has_conflicting_booking(p_provider_id, v_scheduled_at, p_booking_id) then
    raise exception 'provider_schedule_conflict';
  end if;

  return query
  update public.bookings b
  set provider_id = p_provider_id
  where b.id = p_booking_id
    and b.provider_id is null
    and b.status in ('pending_match', 'unmatched')
  returning b.id, b.customer_id, b.provider_id, b.status;
end;
$$;

revoke all on function public.claim_booking_for_provider(uuid, uuid) from public;
grant execute on function public.claim_booking_for_provider(uuid, uuid) to service_role;
