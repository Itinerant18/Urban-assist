-- Admin analytics KPIs. Single security-definer function returning one jsonb
-- blob of headline numbers, aggregated in the DB (no new tables — per spec).
-- service_role-only (the admin app calls it via createServiceRole()).

create or replace function public.get_admin_analytics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total_bookings', (select count(*) from public.bookings),
    'completed', (select count(*) from public.bookings where status = 'completed'),
    'cancelled', (select count(*) from public.bookings where status in ('cancelled', 'unmatched')),
    'active', (select count(*) from public.bookings
                where status in ('assigned', 'on_the_way', 'arrived', 'in_progress')),
    'disputed', (select count(*) from public.bookings where status = 'disputed'),
    'gmv_pence', (select coalesce(sum(total_pence), 0)::bigint
                    from public.bookings where status = 'completed'),
    'bookings_30d', (select count(*) from public.bookings
                       where created_at >= now() - interval '30 days'),
    'gmv_30d_pence', (select coalesce(sum(total_pence), 0)::bigint
                        from public.bookings
                        where status = 'completed' and completed_at >= now() - interval '30 days'),
    'refunds_pence', (select coalesce(sum(amount_pence), 0)::bigint
                        from public.payments where status = 'refunded'),
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'providers', (select count(*) from public.profiles where role = 'provider'),
    'providers_approved', (select count(*) from public.profiles
                             where role = 'provider' and kyc_status = 'approved'),
    'avg_provider_rating', (select round(avg(rating)::numeric, 2)
                              from public.reviews where direction = 'customer_to_provider')
  );
$$;

revoke all on function public.get_admin_analytics() from public;
grant execute on function public.get_admin_analytics() to service_role;
