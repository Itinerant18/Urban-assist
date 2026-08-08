-- Move btree_gist out of the public schema.
--
-- 202608080003 created it with a bare `create extension if not exists btree_gist`, which
-- lands in whatever search_path resolves to -- `public` here. Supabase's linter flags that
-- as extension_in_public: extension objects sitting in the schema PostgREST exposes.
--
-- btree_gist is declared relocatable (verified: pg_available_extension_versions.relocatable
-- = true), and the exclusion constraint that depends on it --
-- bookings_no_provider_overlap, which uses gist_uuid_ops for `provider_id with =` --
-- references the operator class by OID in the index, so relocating the extension does not
-- invalidate the existing index.
--
-- NOTE for future migrations: recreating that constraint still works UNQUALIFIED, because
-- the postgres role's search_path is `"$user", public, extensions` -- verified by dropping
-- and re-adding the constraint both with and without `extensions.gist_uuid_ops` inside a
-- rolled-back transaction after the move; both succeeded.
--
-- The dependency is therefore on that role setting, not on the extension's schema. If a
-- future session ever runs with a search_path that omits `extensions` (a function with
-- `set search_path = ''`, or a self-hosted database configured differently), GiST DDL over
-- a uuid column would fail with "data type uuid has no default operator class for access
-- method gist". Schema-qualifying the operator class is the durable habit; it is not
-- required today.

create schema if not exists extensions;

do $$
declare
  v_schema text;
begin
  select n.nspname into v_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'btree_gist';

  if v_schema is null then
    raise warning 'btree_gist not installed; nothing to relocate';
    return;
  end if;

  if v_schema = 'extensions' then
    raise notice 'btree_gist already in extensions schema';
    return;
  end if;

  alter extension btree_gist set schema extensions;
  raise notice 'btree_gist relocated from % to extensions', v_schema;
end;
$$;

-- The roles that query through PostgREST need to resolve operators from the new home.
-- Supabase grants this by default; stated explicitly so a fresh or self-hosted database
-- behaves the same.
grant usage on schema extensions to anon, authenticated, service_role;
