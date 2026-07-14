-- Restrict KYC storage bucket read access to admins with can_manage_kyc permission
drop policy if exists "provider_documents admin read" on storage.objects;

create policy "provider_documents admin read" on storage.objects
  for select using (
    bucket_id = 'provider_documents'
    and public.user_role() = 'admin'
    and public.admin_has_permission('manage_kyc')
  );
