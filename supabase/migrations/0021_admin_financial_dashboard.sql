-- Service-role-only financial aggregation for the admin ledger.
-- Provider earnings are the booking net price; the current Stripe policy has
-- no application fee, so platform revenue is the residual after net + VAT.

create index if not exists payments_succeeded_booking_idx
  on public.payments (booking_id, created_at desc)
  where status = 'succeeded';

create index if not exists bookings_completed_provider_idx
  on public.bookings (provider_id, completed_at)
  where status = 'completed' and provider_id is not null;

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
    pay.vat_pence
  from public.payments pay
  where pay.status = 'succeeded'
  order by pay.booking_id, pay.created_at desc, pay.id desc
),
booking_financials as (
  select
    b.id,
    b.provider_id,
    b.price_pence,
    b.status,
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
),
provider_summary as (
  select
    provider_id,
    max(full_name) as full_name,
    max(stripe_account_id) as stripe_account_id,
    count(*)::integer as eligible_booking_count,
    coalesce(sum(price_pence), 0)::bigint as provider_payable_pence,
    coalesce(sum(case
      when payout_status is null
        or (payout_status = 'pending' and (lease_expires_at is null or lease_expires_at <= now()))
      then price_pence else 0 end), 0)::bigint as ready_pence,
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
    coalesce((select sum(price_pence) from eligible), 0)::bigint as provider_payable_pence,
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

revoke all on function public.get_admin_financial_dashboard() from public, anon, authenticated;
grant execute on function public.get_admin_financial_dashboard() to service_role;
