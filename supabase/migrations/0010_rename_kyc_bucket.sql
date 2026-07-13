-- Rename storage bucket 'kyc' -> 'provider_documents' to match the provider_documents table.
-- Bucket was originally created via dashboard, so create-if-missing here.

insert into storage.buckets (id, name, public)
values ('provider_documents', 'provider_documents', false)
on conflict (id) do nothing;

-- Move any existing objects across (no-op on fresh environments)
update storage.objects
set bucket_id = 'provider_documents'
where bucket_id = 'kyc';

-- Re-create the four kyc policies against the new bucket id
drop policy if exists "kyc storage provider upload" on storage.objects;
drop policy if exists "kyc storage provider read own" on storage.objects;
drop policy if exists "kyc storage admin read" on storage.objects;
drop policy if exists "kyc storage provider delete own" on storage.objects;

-- re-runnable: drop new-name policies too in case of a partial prior run
drop policy if exists "provider_documents provider upload" on storage.objects;
drop policy if exists "provider_documents provider read own" on storage.objects;
drop policy if exists "provider_documents admin read" on storage.objects;
drop policy if exists "provider_documents provider delete own" on storage.objects;

create policy "provider_documents provider upload" on storage.objects
  for insert with check (
    bucket_id = 'provider_documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "provider_documents provider read own" on storage.objects
  for select using (
    bucket_id = 'provider_documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "provider_documents admin read" on storage.objects
  for select using (
    bucket_id = 'provider_documents'
    and public.user_role() = 'admin'
  );

create policy "provider_documents provider delete own" on storage.objects
  for delete using (
    bucket_id = 'provider_documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: cannot `delete from storage.buckets` here — Supabase blocks direct DML
-- (storage.protect_delete trigger). The old empty 'kyc' bucket is harmless;
-- remove it via Dashboard > Storage or the Storage API if you want it gone.
