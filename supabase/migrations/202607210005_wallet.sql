-- Customer wallet. Append-only ledger is the single source of truth; balance is
-- SUM(amount_pence). Credits are plain inserts (commutative, race-free). Debits
-- go through apply_wallet_credit(), which takes a per-profile advisory lock so
-- two concurrent bookings can't both spend the same balance (a SUM has no single
-- row to guard, unlike the promo counter). Writes are service_role-only.

create table if not exists public.wallet_ledger (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount_pence integer not null,           -- +credit, -debit
  reason text not null,                    -- 'admin_goodwill' | 'booking_spend' | 'booking_spend_refund' | 'referral'
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_profile_idx on public.wallet_ledger (profile_id);

alter table public.wallet_ledger enable row level security;
drop policy if exists "wallet owner reads own ledger" on public.wallet_ledger;
create policy "wallet owner reads own ledger"
  on public.wallet_ledger for select to authenticated
  using (profile_id = auth.uid());
revoke insert, update, delete, truncate on public.wallet_ledger from authenticated;
grant select on public.wallet_ledger to authenticated;
grant select, insert on public.wallet_ledger to service_role;
grant usage, select on sequence public.wallet_ledger_id_seq to service_role;

-- Booking's gross total is unchanged; this records how much wallet credit offset it.
alter table public.bookings
  add column if not exists wallet_applied_pence integer not null default 0;

-- Read a wallet balance. Own balance for a signed-in user; any for service_role.
create or replace function public.wallet_balance(p_profile_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from p_profile_id
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  return coalesce(
    (select sum(amount_pence) from public.wallet_ledger where profile_id = p_profile_id), 0);
end;
$$;

-- Atomically spend up to p_max_pence of a profile's balance, returning the amount
-- actually applied. Advisory lock serialises debits per profile.
create or replace function public.apply_wallet_credit(
  p_profile_id uuid,
  p_max_pence integer,
  p_booking_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_applied integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_profile_id::text));
  select coalesce(sum(amount_pence), 0) into v_balance
    from public.wallet_ledger where profile_id = p_profile_id;
  v_applied := least(greatest(v_balance, 0), greatest(coalesce(p_max_pence, 0), 0));
  if v_applied > 0 then
    insert into public.wallet_ledger (profile_id, amount_pence, reason, booking_id)
    values (p_profile_id, -v_applied, 'booking_spend', p_booking_id);
  end if;
  return v_applied;
end;
$$;

revoke all on function public.wallet_balance(uuid) from public;
grant execute on function public.wallet_balance(uuid) to authenticated, service_role;
revoke all on function public.apply_wallet_credit(uuid, integer, uuid) from public;
grant execute on function public.apply_wallet_credit(uuid, integer, uuid) to service_role;
