-- Keep public.admin_permissions: public.admin_has_permission and its RLS policy
-- still read the table, and the legacy seed-admin scripts still write it. Only
-- the broken auto-insert path is obsolete now that bootstrap-admin provisions
-- the first super_admin membership directly in public.admin_user_roles.
drop trigger if exists trg_new_admin on public.profiles;
drop function if exists public.handle_new_admin();
