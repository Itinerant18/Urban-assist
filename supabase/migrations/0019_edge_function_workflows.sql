-- Durable queues and atomic claims for notification, OTP, and payout edge functions.

-- NOTIFICATIONS -------------------------------------------------------------
alter table public.notifications
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists delivery_attempts integer not null default 0,
  add column if not exists last_delivery_attempt_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_error text;

alter table public.notifications
  drop constraint if exists notifications_delivery_status_check;
alter table public.notifications
  add constraint notifications_delivery_status_check
  check (delivery_status in ('pending', 'processing', 'sent', 'failed'));

create index if not exists notifications_delivery_pending_idx
  on public.notifications (created_at)
  where delivery_status in ('pending', 'failed');

drop policy if exists "notifications owner" on public.notifications;
drop policy if exists "notifications owner read" on public.notifications;
drop policy if exists "notifications owner mark read" on public.notifications;

create policy "notifications owner read" on public.notifications
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "notifications owner mark read" on public.notifications
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke insert, delete, update on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- JOB START OTP -------------------------------------------------------------
alter table public.booking_start_codes
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours'),
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists consumed_at timestamptz;

alter table public.booking_start_codes
  drop constraint if exists booking_start_codes_attempt_count_check;
alter table public.booking_start_codes
  add constraint booking_start_codes_attempt_count_check
  check (attempt_count >= 0 and max_attempts between 1 and 10);

update public.booking_start_codes sc
set expires_at = greatest(sc.expires_at, b.scheduled_at + interval '4 hours')
from public.bookings b
where b.id = sc.booking_id;

create or replace function public.create_booking_start_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.booking_start_codes (booking_id, customer_id, code, expires_at)
  values (
    new.id,
    new.customer_id,
    public.generate_booking_start_code(),
    greatest(now() + interval '24 hours', new.scheduled_at + interval '4 hours')
  )
  on conflict (booking_id) do nothing;
  return new;
end;
$$;

create or replace function public.extend_booking_start_code_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.booking_start_codes
  set expires_at = greatest(expires_at, new.scheduled_at + interval '4 hours')
  where booking_id = new.id and consumed_at is null;
  return new;
end;
$$;

revoke all on function public.extend_booking_start_code_expiry()
  from public, anon, authenticated;

drop trigger if exists bookings_extend_start_code_expiry on public.bookings;
create trigger bookings_extend_start_code_expiry
after update of scheduled_at on public.bookings
for each row
when (old.scheduled_at is distinct from new.scheduled_at)
execute function public.extend_booking_start_code_expiry();

create or replace function public.verify_booking_start_code(
  p_booking_id uuid,
  p_provider_id uuid,
  p_code text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_code public.booking_start_codes%rowtype;
  assigned_provider uuid;
  booking_state public.booking_status;
begin
  if p_code !~ '^\d{4}$' then
    return 'invalid_start_code';
  end if;

  select b.provider_id, b.status
    into assigned_provider, booking_state
  from public.bookings b
  where b.id = p_booking_id;

  if not found then
    return 'booking_not_found';
  end if;
  if assigned_provider is distinct from p_provider_id then
    return 'forbidden';
  end if;
  if booking_state <> 'arrived' then
    return 'invalid_status_transition';
  end if;

  select * into start_code
  from public.booking_start_codes
  where booking_id = p_booking_id
  for update;

  if not found then
    return 'start_code_not_found';
  end if;
  if start_code.consumed_at is not null then
    return 'start_code_already_used';
  end if;
  if start_code.expires_at <= now() then
    return 'start_code_expired';
  end if;
  if start_code.attempt_count >= start_code.max_attempts then
    return 'too_many_attempts';
  end if;

  update public.booking_start_codes
  set attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      consumed_at = case when code = p_code then now() else consumed_at end
  where booking_id = p_booking_id;

  if start_code.code = p_code then
    return 'verified';
  end if;
  return 'invalid_start_code';
end;
$$;

revoke all on function public.verify_booking_start_code(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.verify_booking_start_code(uuid, uuid, text)
  to service_role;

-- PAYMENT RELEASE -----------------------------------------------------------
alter table public.payouts
  add column if not exists booking_id uuid references public.bookings(id) on delete restrict,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists lease_expires_at timestamptz,
  add column if not exists failure_reason text;

alter table public.payouts
  drop constraint if exists payouts_booking_id_key;
alter table public.payouts
  add constraint payouts_booking_id_key unique (booking_id);

create index if not exists payouts_release_queue_idx
  on public.payouts (status, lease_expires_at)
  where booking_id is not null and status <> 'paid';

create or replace function public.claim_booking_payout(p_booking_id uuid)
returns table (
  payout_id uuid,
  provider_id uuid,
  amount_pence integer,
  stripe_account_id text,
  claim_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  eligible record;
  claimed public.payouts%rowtype;
begin
  select
    b.provider_id,
    b.price_pence,
    coalesce(b.completed_at::date, current_date) as service_date,
    p.stripe_account_id
  into eligible
  from public.bookings b
  join public.payments pay on pay.booking_id = b.id
  join public.profiles p on p.id = b.provider_id
  where b.id = p_booking_id
    and b.status = 'completed'
    and pay.status = 'succeeded'
  order by pay.created_at desc
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'payout_not_eligible';
  end if;
  if eligible.stripe_account_id is null then
    raise exception using errcode = 'P0001', message = 'provider_stripe_account_missing';
  end if;

  insert into public.payouts (
    booking_id,
    provider_id,
    amount_pence,
    period_start,
    period_end,
    status,
    updated_at,
    lease_expires_at
  ) values (
    p_booking_id,
    eligible.provider_id,
    eligible.price_pence,
    eligible.service_date,
    eligible.service_date,
    'pending',
    now(),
    now() + interval '10 minutes'
  )
  on conflict (booking_id) do nothing
  returning * into claimed;

  if found then
    return query select
      claimed.id,
      claimed.provider_id,
      claimed.amount_pence,
      eligible.stripe_account_id,
      'claimed'::text;
    return;
  end if;

  select * into claimed
  from public.payouts
  where booking_id = p_booking_id
  for update;

  if claimed.status = 'paid' then
    return query select
      claimed.id,
      claimed.provider_id,
      claimed.amount_pence,
      eligible.stripe_account_id,
      'paid'::text;
    return;
  end if;

  if claimed.status = 'pending' and claimed.lease_expires_at > now() then
    return query select
      claimed.id,
      claimed.provider_id,
      claimed.amount_pence,
      eligible.stripe_account_id,
      'processing'::text;
    return;
  end if;

  update public.payouts
  set status = 'pending',
      failure_reason = null,
      updated_at = now(),
      lease_expires_at = now() + interval '10 minutes'
  where id = claimed.id
  returning * into claimed;

  return query select
    claimed.id,
    claimed.provider_id,
    claimed.amount_pence,
    eligible.stripe_account_id,
    'claimed'::text;
end;
$$;

revoke all on function public.claim_booking_payout(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_booking_payout(uuid)
  to service_role;
