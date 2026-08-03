-- Pre-OTP role check must read auth.users.phone (what OTP authenticates), not
-- profiles.phone — live data shows profile phones drift in both format
-- (+44... vs 44...) and value. Service-role only; auth.users stores digits-only.
create or replace function public.role_for_phone(p_phone text)
returns text
language sql
security definer
set search_path = ''
as $$
  select p.role::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.phone = regexp_replace(p_phone, '\D', '', 'g')
  limit 1;
$$;

revoke all on function public.role_for_phone(text) from public, anon, authenticated;
grant execute on function public.role_for_phone(text) to service_role;
