-- Mirror auth.users.phone into profiles on signup (phone-OTP users had null profiles.phone).

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing profiles that are missing the phone their auth user has.
update profiles p
set phone = u.phone
from auth.users u
where u.id = p.id
  and p.phone is null
  and u.phone is not null;
