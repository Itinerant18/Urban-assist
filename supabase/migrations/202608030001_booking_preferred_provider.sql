-- Soft preference for dispatch / offer cascade. Never a hard guarantee.
alter table public.bookings
  add column if not exists preferred_provider_id uuid
    references public.profiles(id) on delete set null;

create index if not exists bookings_preferred_provider_id_idx
  on public.bookings (preferred_provider_id)
  where preferred_provider_id is not null;

-- Same eligibility as 202607210001; adds is_preferred + preferred-first order.
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
  is_preferred boolean
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
    and not exists (
      select 1
      from public.bookings busy
      where busy.provider_id = p.id
        and busy.status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
        and busy.scheduled_at between t.scheduled_at - interval '60 minutes'
                                  and t.scheduled_at + interval '60 minutes'
    ) as is_available,
    (t.preferred_provider_id is not null and p.id = t.preferred_provider_id) as is_preferred
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
    (t.preferred_provider_id is not null and p.id = t.preferred_provider_id) desc,
    is_available desc,
    rating desc,
    completed_jobs desc,
    p.id;
$$;

revoke all on function public.get_assignment_candidates(uuid) from public;
grant execute on function public.get_assignment_candidates(uuid) to service_role;
