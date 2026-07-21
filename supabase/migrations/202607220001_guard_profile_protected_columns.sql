-- Protected profile state may only be changed by trusted server-side callers.
create or replace function public.guard_profile_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.kyc_status is distinct from old.kyc_status
    or new.role is distinct from old.role
    or new.registration_completed is distinct from old.registration_completed
  ) and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'protected_profile_columns';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_protected_columns on public.profiles;
create trigger guard_profile_protected_columns
before update of kyc_status, role, registration_completed on public.profiles
for each row execute function public.guard_profile_protected_columns();
