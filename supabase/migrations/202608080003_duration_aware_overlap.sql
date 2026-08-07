-- Make the provider double-booking guard duration-aware.
--
-- provider_has_conflicting_booking (202608070003) compared start times against a flat
-- +/-60 minute window, inherited verbatim from admin_assign_booking. That is wrong by
-- construction for any job longer than an hour: a 4-hour deep clean at 09:00 runs to
-- 13:00, and a second job at 10:15 is 75 minutes away, so the window says "no conflict"
-- and the provider is double-booked for nearly three hours. provider_services.duration_mins
-- already exists (0001_schema.sql:84, default 60) but was never consulted.
--
-- Approach: denormalise the duration onto bookings so the interval is a property of the
-- row, add a generated ends_at, compare real ranges, and let the storage engine enforce
-- it with an exclusion constraint. The constraint is the real fix -- the function can be
-- bypassed by any code path that writes bookings directly, a GiST exclusion cannot.

create extension if not exists btree_gist;

-- Denormalised because a generated column cannot reference another table. The trigger
-- below keeps it populated, so no insert site has to remember it.
alter table public.bookings
  add column if not exists duration_mins integer not null default 60;

-- ends_at is a plain column maintained by the trigger below, NOT a generated column:
-- `timestamptz + interval` is STABLE rather than IMMUTABLE (it depends on the session
-- TimeZone for DST), so Postgres rejects it in a generation expression with 42P17 -- and
-- would reject it in the exclusion constraint expression for the same reason. Storing it
-- keeps both the constraint and the range comparisons on immutable plain columns.
alter table public.bookings
  add column if not exists ends_at timestamptz;

-- Backfill from the provider_service the booking was created against, preferring the SKU
-- duration where one is set (202607210007 made SKUs the source of truth for pricing and
-- duration), falling back to the provider_service, then to the 60-minute default.
update public.bookings b
set duration_mins = coalesce(sku.duration_mins, ps.duration_mins, 60)
from public.provider_services ps
left join public.service_skus sku on sku.id = ps.sku_id
where ps.id = b.provider_service_id
  and b.duration_mins = 60
  and coalesce(sku.duration_mins, ps.duration_mins, 60) <> 60;

-- Keeps duration_mins and ends_at correct on every write path, including admin-created
-- bookings and seeds, so no insert site has to remember either column. Runs on UPDATE too
-- because a reschedule moves scheduled_at and ends_at must follow it.
create or replace function public.bookings_fill_duration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 60 is the column default, so it is indistinguishable from "caller did not say".
  -- Treat it as unset and resolve from the service; SKU duration wins where set
  -- (202607210007 made SKUs the source of truth), then provider_service, then 60.
  if new.duration_mins is null or new.duration_mins = 60 then
    select coalesce(sku.duration_mins, ps.duration_mins, 60)
    into new.duration_mins
    from public.provider_services ps
    left join public.service_skus sku on sku.id = ps.sku_id
    where ps.id = new.provider_service_id;

    if new.duration_mins is null then
      new.duration_mins := 60;
    end if;
  end if;

  new.ends_at := new.scheduled_at + make_interval(mins => new.duration_mins);
  return new;
end;
$$;

drop trigger if exists bookings_fill_duration_trg on public.bookings;
create trigger bookings_fill_duration_trg
before insert or update of scheduled_at, duration_mins, provider_service_id
on public.bookings
for each row execute function public.bookings_fill_duration();

-- Backfill ends_at for existing rows, then make it mandatory: a null upper bound would
-- make tstzrange unbounded and collide with every other booking for that provider.
update public.bookings
set ends_at = scheduled_at + make_interval(mins => duration_mins)
where ends_at is null;

alter table public.bookings alter column ends_at set not null;

-- Real interval overlap. Signature changes (the caller must now supply the candidate
-- slot's end), so the 3-argument version is dropped rather than left as an overload that
-- would silently keep the old start-time-only semantics alive.
drop function if exists public.provider_has_conflicting_booking(uuid, timestamptz, uuid);

create or replace function public.provider_has_conflicting_booking(
  p_provider_id uuid,
  p_scheduled_at timestamptz,
  p_ends_at timestamptz,
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
      -- Half-open ranges: a job ending at 11:00 does not conflict with one starting
      -- at 11:00. tstzrange's default '[)' bound gives exactly that.
      and tstzrange(busy.scheduled_at, busy.ends_at)
          && tstzrange(p_scheduled_at, coalesce(p_ends_at, p_scheduled_at + interval '60 minutes'))
  );
$$;

revoke all on function public.provider_has_conflicting_booking(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.provider_has_conflicting_booking(uuid, timestamptz, timestamptz, uuid) to service_role;

-- Storage-level enforcement. Any writer that assigns a provider to overlapping live
-- bookings now fails, regardless of which code path it came through.
--
-- Created conditionally: adding an exclusion constraint fails outright if existing rows
-- already violate it, which would block the whole deploy. Legacy overlaps are plausible
-- precisely because the old guard was duration-blind. If any exist the constraint is
-- skipped with a warning naming the count, so the push output says so instead of the
-- migration dying.
do $$
declare
  v_violations integer;
begin
  if exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'bookings_no_provider_overlap'
  ) then
    return;
  end if;

  select count(*) into v_violations
  from public.bookings a
  join public.bookings b
    on b.provider_id = a.provider_id
   and b.id <> a.id
   and tstzrange(a.scheduled_at, a.ends_at) && tstzrange(b.scheduled_at, b.ends_at)
  where a.provider_id is not null
    and a.status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
    and b.status in ('assigned', 'on_the_way', 'arrived', 'in_progress');

  if v_violations > 0 then
    raise warning 'bookings_no_provider_overlap NOT created: % existing overlapping pair(s). Resolve them, then re-run this DO block.', v_violations;
    return;
  end if;

  alter table public.bookings
    add constraint bookings_no_provider_overlap
    exclude using gist (
      provider_id with =,
      tstzrange(scheduled_at, ends_at) with &&
    )
    where (
      provider_id is not null
      and status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
    );
  raise notice 'bookings_no_provider_overlap created';
end;
$$;

-- Both callers must move to the 4-argument signature in this same migration: the 3-arg
-- version was dropped above, so leaving either behind would break the accept path and
-- admin candidate selection at runtime.

-- get_assignment_candidates: body from 202608070003 (which is itself based on
-- 202608030004 -- 11 output columns including training_eligible). Changes here are the
-- target CTE now selecting ends_at, and the conflict call passing it.
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
    )
    and not exists (
      select 1
      from public.time_off off_period
      where off_period.provider_id = p.id
        and t.scheduled_at::date between off_period.start_date and off_period.end_date
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

-- claim_booking_for_provider: body from 202608080002 (row lock before advisory lock --
-- do not reorder, see that migration's header). Change here is reading ends_at and
-- passing it to the conflict check.
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
  v_ends_at timestamptz;
begin
  select b.scheduled_at, b.ends_at into v_scheduled_at, v_ends_at
  from public.bookings b
  where b.id = p_booking_id
    and b.provider_id is null
    and b.status in ('pending_match', 'unmatched')
  for update;

  if not found then
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_provider_id::text, 0));

  if public.provider_has_conflicting_booking(p_provider_id, v_scheduled_at, v_ends_at, p_booking_id) then
    raise exception 'provider_schedule_conflict' using errcode = 'P0001';
  end if;

  return query
  update public.bookings b
  set provider_id = p_provider_id,
      status = 'assigned',
      matched_at = now()
  where b.id = p_booking_id
    and b.provider_id is null
    and b.status in ('pending_match', 'unmatched')
  returning b.id, b.customer_id, b.provider_id, b.status;
end;
$$;

revoke all on function public.claim_booking_for_provider(uuid, uuid) from public;
grant execute on function public.claim_booking_for_provider(uuid, uuid) to service_role;
