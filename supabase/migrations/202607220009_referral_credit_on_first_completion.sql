alter table public.referrals
  add column if not exists credited_at timestamptz;

create or replace function public.credit_referrer_on_first_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral record;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.customer_id = new.customer_id
      and b.status = 'completed'
      and b.id <> new.id
  ) then
    return new;
  end if;

  select r.id, r.owner_id, r.credit_pence
  into v_referral
  from public.referrals r
  where r.redeemed_by = new.customer_id
    and r.owner_id <> new.customer_id
    and r.credited_at is null
  order by r.redeemed_at asc nulls last, r.id
  limit 1
  for update;

  if not found then
    return new;
  end if;

  update public.referrals
  set credited_at = now()
  where id = v_referral.id
    and credited_at is null;

  if not found then
    return new;
  end if;

  insert into public.wallet_ledger (profile_id, amount_pence, reason, booking_id)
  values (v_referral.owner_id, v_referral.credit_pence, 'referral', new.id);

  return new;
end;
$$;

revoke all on function public.credit_referrer_on_first_completion()
  from public, anon, authenticated;

drop trigger if exists bookings_credit_referrer on public.bookings;
create trigger bookings_credit_referrer
after update of status on public.bookings
for each row
when (old.status is distinct from new.status and new.status = 'completed')
execute function public.credit_referrer_on_first_completion();
