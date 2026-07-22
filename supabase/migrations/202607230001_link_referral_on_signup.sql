create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Keep the phone mirror from 0013 — dropping it would null profiles.phone
  -- for every new phone-OTP signup.
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'customer')
  )
  on conflict (id) do nothing;

  if new.raw_user_meta_data->>'referral_code' is not null then
    update public.referrals
    set redeemed_by = new.id,
        redeemed_at = now()
    where code = new.raw_user_meta_data->>'referral_code'
      and redeemed_by is null
      and owner_id <> new.id;
  end if;

  return new;
end;
$$;
