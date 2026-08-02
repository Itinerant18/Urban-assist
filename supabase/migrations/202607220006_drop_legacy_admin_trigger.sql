-- Reconstructed from supabase_migrations.schema_migrations on the linked project.
--
-- This migration was applied to the remote database, but its file was missing from
-- this repository. That mismatch made the CLI refuse to push any new migration,
-- because it will not operate on a history it cannot account for.
--
-- The statements below are exactly those recorded in the migration history, joined
-- in their recorded order. Applied remotely as 202607220006 (drop_legacy_admin_trigger),
-- so it is already present on that database; the file exists so local and remote
-- agree, not to be re-run against it.

-- Keep public.admin_permissions: public.admin_has_permission and its RLS policy
-- still read the table, and the legacy seed-admin scripts still write it. Only
-- the broken auto-insert path is obsolete now that bootstrap-admin provisions
-- the first super_admin membership directly in public.admin_user_roles.
drop trigger if exists trg_new_admin on public.profiles;

drop function if exists public.handle_new_admin();
