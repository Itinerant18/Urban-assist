-- 202608050001 created a policy cycle: "offers customer read" (booking_offers)
-- subqueries bookings, and the new "booking offered provider read" (bookings)
-- subqueries booking_offers -> "infinite recursion detected in policy for
-- relation booking_offers" on any addresses/bookings/offers read.
-- Fix: move the cross-table checks into SECURITY DEFINER helpers, which run as
-- the function owner and bypass RLS inside, breaking the cycle.

create or replace function public.user_has_offer_on_booking(p_booking_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.booking_offers o
    where o.booking_id = p_booking_id
      and o.provider_id = auth.uid()
  );
$$;

create or replace function public.user_serves_address(p_address_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.address_id = p_address_id
      and (
        b.provider_id = auth.uid()
        or exists (
          select 1 from public.booking_offers o
          where o.booking_id = b.id
            and o.provider_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.user_has_offer_on_booking(uuid) from public, anon;
revoke all on function public.user_serves_address(uuid) from public, anon;
grant execute on function public.user_has_offer_on_booking(uuid) to authenticated;
grant execute on function public.user_serves_address(uuid) to authenticated;

drop policy if exists "booking offered provider read" on public.bookings;
create policy "booking offered provider read" on public.bookings
  for select to authenticated
  using (public.user_has_offer_on_booking(id));

drop policy if exists "addresses booking provider read" on public.addresses;
create policy "addresses booking provider read" on public.addresses
  for select to authenticated
  using (public.user_serves_address(id));
