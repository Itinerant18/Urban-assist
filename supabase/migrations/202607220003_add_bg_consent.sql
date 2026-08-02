-- Reconstructed from supabase_migrations.schema_migrations on the linked project.
--
-- This migration was applied to the remote database, but its file was missing from
-- this repository. That mismatch made the CLI refuse to push any new migration,
-- because it will not operate on a history it cannot account for.
--
-- The statements below are exactly those recorded in the migration history, joined
-- in their recorded order. Applied remotely as 202607220003 (add_bg_consent),
-- so it is already present on that database; the file exists so local and remote
-- agree, not to be re-run against it.

alter table public.profiles
  add column bg_consent boolean not null default false;
