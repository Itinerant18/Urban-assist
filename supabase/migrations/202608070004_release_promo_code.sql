-- Compensating release for redeem_promo_code.
--
-- createBooking (packages/domain/src/bookings/services/booking-service.ts) reserves
-- a promo redemption before inserting the booking, because the discount is needed to
-- compute the totals that go into the insert. Its own comment recorded the leak: if
-- the insert then fails -- most commonly the bookings_dedupe_active_idx unique
-- violation on a double-click -- the redemption was already counted and never given
-- back, so a limited code burns down without any booking to show for it.
--
-- Rather than restructure createBooking into one transaction (the insert is followed
-- by wallet and Stripe steps that are already individually compensated), this gives
-- the caller a release to call on the failure path, in the same style as the wallet
-- and payment compensation further down that function.

create or replace function public.release_promo_code(p_promo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- greatest(...,0) so a double release can never drive the count negative and
  -- hand out redemptions beyond max_redemptions.
  update public.promo_codes pc
    set redemption_count = greatest(pc.redemption_count - 1, 0)
    where pc.id = p_promo_id;
end;
$$;

revoke all on function public.release_promo_code(uuid) from public;
grant execute on function public.release_promo_code(uuid) to service_role;
