-- Platform-managed pricing: provider_services.price_pence is derived from the SKU.
--
-- createBooking now prices a job from service_skus (resolveServicePrice), so what a
-- provider stores on their own row no longer decides what a customer is charged.
-- But provider_services.price_pence is still *displayed* — the customer browse list
-- and public provider profile read it — and the row is client-writable under
-- "provider services owner manage" (0002_rls.sql). Left alone, a provider could
-- advertise £20, and the customer would then be charged the SKU rate at checkout.
--
-- A trigger closes that at the source instead of trusting every writer: the editor UI,
-- any future admin tool, and a hand-rolled PostgREST call all get the same answer.
-- Column grants would only have blocked the insert; this makes the stored value
-- correct rather than absent.
--
-- Rows with no sku_id keep their stored price. Those predate the SKU hierarchy
-- (202607210007) and have no SKU to derive from; resolveServicePrice falls back to
-- them for exactly the same reason.

create or replace function public.set_provider_service_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price integer;
begin
  if new.sku_id is not null then
    select s.min_price_pence
      into v_price
      from public.service_skus s
     where s.id = new.sku_id
       and s.is_active;

    -- Only overwrite when the SKU actually carries a price. A missing or retired SKU
    -- must not blank the row: `select into` yields NULL when no row matches, and
    -- price_pence is NOT NULL.
    if v_price is not null then
      new.price_pence := v_price;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.set_provider_service_price() from public, anon, authenticated;

drop trigger if exists trg_provider_service_price on public.provider_services;
create trigger trg_provider_service_price
  before insert or update of sku_id, price_pence on public.provider_services
  for each row
  execute function public.set_provider_service_price();

-- Realign existing SKU-linked rows so listings match what checkout will charge.
update public.provider_services ps
   set price_pence = s.min_price_pence
  from public.service_skus s
 where ps.sku_id = s.id
   and s.is_active
   and s.min_price_pence is not null
   and ps.price_pence is distinct from s.min_price_pence;
