-- Let a provider see which postcode areas they are eligible for.
--
-- provider_service_areas has RLS enabled and exactly one policy, "Admins manage
-- provider service areas" (202607210001), so providers could not read even their own
-- coverage. That table drives manual-assignment eligibility ("Empty coverage means the
-- provider is not yet eligible for manual assignment"), which makes it something a
-- provider needs to be able to see.
--
-- SELECT only, deliberately. Coverage stays admin-managed: it has a created_by column
-- and decides which jobs ops can dispatch, so letting providers grant themselves areas
-- would change who controls dispatch. Read access answers "why am I not getting work
-- in X?" without moving that control.

drop policy if exists "Providers read own service areas" on public.provider_service_areas;
create policy "Providers read own service areas"
on public.provider_service_areas for select to authenticated
using (provider_id = (select auth.uid()));
