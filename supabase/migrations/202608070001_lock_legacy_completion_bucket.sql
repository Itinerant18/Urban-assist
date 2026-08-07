-- Lock down the legacy public 'completion' bucket.
--
-- Created by 0005_stripe_and_completion.sql as public=true with an unconditional
-- read policy, it was superseded by the private 'completion-photos' bucket in
-- 0017_secure_job_start_and_completion.sql but never removed. Completion photos
-- are customer home interiors, so unauthenticated read-by-URL is a disclosure.
--
-- No application code references it: every read and write path uses
-- 'completion-photos' (apps/provider/app/(app)/jobs/[id]/page.tsx,
-- apps/provider/app/api/jobs/[id]/complete/route.ts). Any objects still in the
-- bucket are orphaned, so they are left in place rather than deleted -- flipping
-- the bucket private is enough to stop the disclosure without destroying data.

update storage.buckets
set public = false
where id = 'completion';

-- With no remaining policies and public=false, the bucket is service-role only.
drop policy if exists "completion public read" on storage.objects;
drop policy if exists "completion provider insert" on storage.objects;
