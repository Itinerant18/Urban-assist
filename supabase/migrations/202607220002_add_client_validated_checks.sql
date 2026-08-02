-- Reconstructed from supabase_migrations.schema_migrations on the linked project.
--
-- This migration was applied to the remote database, but its file was missing from
-- this repository. That mismatch made the CLI refuse to push any new migration,
-- because it will not operate on a history it cannot account for.
--
-- The statements below are exactly those recorded in the migration history, joined
-- in their recorded order. Applied remotely as 202607220002 (add_client_validated_checks),
-- so it is already present on that database; the file exists so local and remote
-- agree, not to be re-run against it.

alter table public.provider_services
  add constraint provider_services_price_pence_bounds_check
  check (price_pence between 0 and 50000);

alter table public.referrals
  add constraint referrals_credit_pence_fixed_check
  check (credit_pence = 500);
