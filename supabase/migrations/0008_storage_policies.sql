-- Storage bucket RLS policies
-- Requires: supabase storage buckets created via dashboard or mgmt API

-- ============================================================
-- Bucket: kyc (provider identity documents)
-- ============================================================
create policy "kyc storage provider upload" on storage.objects
  for insert with check (
    bucket_id = 'kyc'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "kyc storage provider read own" on storage.objects
  for select using (
    bucket_id = 'kyc'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "kyc storage admin read" on storage.objects
  for select using (
    bucket_id = 'kyc'
    and public.user_role() = 'admin'
  );

create policy "kyc storage provider delete own" on storage.objects
  for delete using (
    bucket_id = 'kyc'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Bucket: completion-photos (booking completion evidence)
-- ============================================================
create policy "completion_photos provider insert" on storage.objects
  for insert with check (
    bucket_id = 'completion-photos'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from bookings b
      where b.provider_id = auth.uid()
        and b.id::text = (storage.foldername(name))[1]::text
    )
  );

create policy "completion_photos participants read" on storage.objects
  for select using (
    bucket_id = 'completion-photos'
    and auth.role() = 'authenticated'
    and (
      exists (
        select 1 from bookings b
        where b.id::text = (storage.foldername(name))[1]::text
          and (b.customer_id = auth.uid() or b.provider_id = auth.uid())
      )
      or public.user_role() = 'admin'
    )
  );

-- ============================================================
-- Bucket: avatars (profile pictures)
-- ============================================================
create policy "avatars owner all" on storage.objects
  for all using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars public read" on storage.objects
  for select using (
    bucket_id = 'avatars'
  );
