-- Make the service catalogue structurally read-only to clients.
--
-- service_categories, service_subcategories, service_skus and service_attributes each
-- have RLS enabled with a single SELECT policy, so client writes are already rejected —
-- but `authenticated` still holds INSERT, UPDATE and DELETE on all four. Today the
-- only thing standing between a provider and the price list is the *absence* of a
-- write policy. Add one carelessly later (an admin policy without a role check, say)
-- and the grants are waiting underneath.
--
-- This matters more since pricing became platform-managed: service_skus.min_price_pence
-- is now the authoritative price for a booking (resolveServicePrice, and the
-- trg_provider_service_price trigger). A provider who could write that table could set
-- their own rate again, which is exactly what central pricing exists to prevent.
--
-- Safe to revoke: admin catalogue CRUD goes through requireAdminRole(), which returns
-- createServiceRole() (apps/admin/lib/admin-auth.ts), so it bypasses RLS and grants.
-- No client-side code writes these tables.

-- TRUNCATE is included because, unlike the DML verbs, it is not subject to row
-- security — a policy cannot stop it. It is granted here only because Supabase's
-- default template grants it across the public schema (36 tables carry it), and
-- PostgREST exposes no TRUNCATE verb, so it is not reachable over the API. Dropping
-- it on these five means the read-only claim above holds without depending on that.
revoke insert, update, delete, truncate on public.service_categories from anon, authenticated;
revoke insert, update, delete, truncate on public.service_subcategories from anon, authenticated;
revoke insert, update, delete, truncate on public.service_skus from anon, authenticated;
revoke insert, update, delete, truncate on public.service_attributes from anon, authenticated;

-- profiles keeps its column-scoped UPDATE from 202608020001; these are the verbs no
-- client should hold on a user table at all.
revoke insert, delete, truncate on public.profiles from anon, authenticated;

grant all on public.service_categories to service_role;
grant all on public.service_subcategories to service_role;
grant all on public.service_skus to service_role;
grant all on public.service_attributes to service_role;
