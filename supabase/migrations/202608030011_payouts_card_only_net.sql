-- Two payout money bugs:
-- 1. claim_booking_payout accepted any succeeded payment, including CASH — cash
--    is collected by the provider in person, so releasing it again via Stripe
--    transfer paid the provider twice. Card payments only.
-- 2. get_admin_financial_dashboard's ready_pence summed gross booking price
--    while the actual transfer is commission-net, so "Releasable £X" and the
--    batch-release label overstated every figure. Net it with commission_bps.
-- Cash bookings stay in gross_processed / vat / platform_revenue metrics (that
-- money was genuinely processed); they only leave the payout pipeline.

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
    and pay.method = 'card'
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
      when payout_status is null
        or (payout_status = 'pending' and (lease_expires_at is null or lease_expires_at <= now()))
      then net_pence else 0 end), 0)::bigint as ready_pence,
    coalesce(sum(case
      when payout_status = 'pending' and lease_expires_at > now()
      then payout_amount_pence else 0 end), 0)::bigint as processing_pence,
    coalesce(sum(case when payout_status = 'paid' then payout_amount_pence else 0 end), 0)::bigint as paid_pence,
    coalesce(sum(case when payout_status = 'failed' then payout_amount_pence else 0 end), 0)::bigint as failed_pence,
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
      'releasable_pence', ready_pence + failed_pence,
      'release_status', case
        when ready_pence > 0 then 'ready'
        when processing_pence > 0 then 'processing'
        when failed_pence > 0 then 'failed'
        else 'paid'
      end,
      'last_failure_reason', last_failure_reason
    ) order by (ready_pence + failed_pence) desc, full_name asc)
    from provider_summary
  ), '[]'::jsonb)
)
from metrics;
$$;
