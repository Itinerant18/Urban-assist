-- Reconstructed from supabase_migrations.schema_migrations on the linked project.
--
-- This migration was applied to the remote database, but its file was missing from
-- this repository. That mismatch made the CLI refuse to push any new migration,
-- because it will not operate on a history it cannot account for.
--
-- The statements below are exactly those recorded in the migration history, joined
-- in their recorded order. Applied remotely as 202607240001 (create_avatars_bucket),
-- so it is already present on that database; the file exists so local and remote
-- agree, not to be re-run against it.

-- The avatars RLS policies (0008) were written against a bucket that the
-- migrations never created (the header there notes buckets are made via the
-- dashboard). Create it here so avatar uploads work on a fresh environment.
-- Public bucket: 0008 already grants "avatars public read".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
