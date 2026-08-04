-- Providers judging or working a booking could not read the booking row or its
-- address: "booking provider read" requires provider_id = auth.uid() (null while
-- an offer is pending) and addresses were owner-only. The offer modal and offers
-- list therefore rendered null joins ("Job", £0.00, no distance, no map).

create policy "booking offered provider read" on public.bookings
  for select to authenticated
  using (
    exists (
      select 1 from public.booking_offers o
      where o.booking_id = id
        and o.provider_id = (select auth.uid())
    )
  );

create policy "addresses booking provider read" on public.addresses
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.address_id = id
        and (
          b.provider_id = (select auth.uid())
          or exists (
            select 1 from public.booking_offers o
            where o.booking_id = b.id
              and o.provider_id = (select auth.uid())
          )
        )
    )
  );
