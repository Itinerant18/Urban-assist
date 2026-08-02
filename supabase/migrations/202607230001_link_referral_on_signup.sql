-- Reconstructed from supabase_migrations.schema_migrations on the linked project.
--
-- This migration was applied to the remote database, but its file was missing from
-- this repository. That mismatch made the CLI refuse to push any new migration,
-- because it will not operate on a history it cannot account for.
--
-- The statements below are exactly those recorded in the migration history, joined
-- in their recorded order. Applied remotely as 202607230001 (link_referral_on_signup),
-- so it is already present on that database; the file exists so local and remote
-- agree, not to be re-run against it.

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
