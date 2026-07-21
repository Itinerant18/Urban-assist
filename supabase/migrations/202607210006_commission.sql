-- Platform commission. Until now claim_booking_payout paid providers 100% of
-- b.price_pence — the platform took 0%. This adds configurable commission
-- (basis points, per category with a null-category default) and applies it when
-- the payout row is created: payout = price_pence - round(price_pence * bps/10000).
-- Default seeded at 0 bps so applying this migration changes NO live payout;
-- admins set real rates in /pricing.

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid unique references public.service_categories(id) on delete cascade,
  rate_bps integer not null check (rate_bps between 0 and 10000),
  updated_at timestamptz not null default now()
);
-- Only one null-category (default) row allowed (NULLs bypass the column UNIQUE).
create unique index if not exists commission_rules_default_idx
  on public.commission_rules ((true)) where category_id is null;

insert into public.commission_rules (category_id, rate_bps)
  select null, 0
  where not exists (select 1 from public.commission_rules where category_id is null);

alter table public.commission_rules enable row level security;
-- Admin-only: service_role bypasses RLS; no authenticated policy = no client reads.

create or replace function public.commission_bps(p_category_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select rate_bps from public.commission_rules where category_id = p_category_id),
    (select rate_bps from public.commission_rules where category_id is null),
    0
  );
$$;
revoke all on function public.commission_bps(uuid) from public;
grant execute on function public.commission_bps(uuid) to service_role;

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
    b.category_id,
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
    eligible.price_pence - round(eligible.price_pence * public.commission_bps(eligible.category_id) / 10000.0)::integer,
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

revoke all on function public.claim_booking_payout(uuid) from public, anon, authenticated;
grant execute on function public.claim_booking_payout(uuid) to service_role;
