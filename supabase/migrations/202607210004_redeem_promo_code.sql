-- Atomic promo-code redemption. The previous inline lookup in createBooking
-- checked expiry but ignored max_redemptions and never incremented
-- redemption_count, so limited codes could be redeemed without limit. This
-- reserves one redemption in a single UPDATE ... RETURNING: the row only comes
-- back if the code exists, is unexpired, and is under its redemption cap.
-- Returns no row (→ no discount applied) otherwise.

create or replace function public.redeem_promo_code(p_code text)
returns table (id uuid, discount_type text, discount_value integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.promo_codes pc
    set redemption_count = pc.redemption_count + 1
    where upper(pc.code) = upper(p_code)
      and (pc.expires_at is null or pc.expires_at > now())
      and (pc.max_redemptions is null or pc.redemption_count < pc.max_redemptions)
    returning pc.id, pc.discount_type, pc.discount_value;
end;
$$;

revoke all on function public.redeem_promo_code(text) from public;
grant execute on function public.redeem_promo_code(text) to service_role;
