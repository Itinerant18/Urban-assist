alter table public.provider_services
  add constraint provider_services_price_pence_bounds_check
  check (price_pence between 0 and 50000);

alter table public.referrals
  add constraint referrals_credit_pence_fixed_check
  check (credit_pence = 500);
