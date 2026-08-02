-- Harden profiles against self-escalation.
--
-- Problem: 0002_rls.sql:38 created
--     create policy "update own profile" on profiles for update using (id = auth.uid());
-- with no column restriction. RLS gates *which rows* you may touch, never *which
-- columns*. Combined with Supabase's default blanket table grants to `authenticated`,
-- any signed-in user could update every column on their own row straight from the
-- browser: role => 'admin', kyc_status => 'approved' (the gate in matching's
-- findCandidates), is_blocked => false, rating_avg, acceptance_rate, stripe_account_id.
--
-- The role-change trigger (0006_audit_log.sql:51) is AFTER UPDATE and only writes an
-- audit row; it does not block the change.
--
-- Fix: column-level UPDATE privileges — the Postgres-native mechanism for this.
-- The row-scoping policy above still applies on top (both must pass).
--
-- Every other profiles write already runs through a service-role path:
--   apps/provider/app/api/register/route.ts  (createServiceRole, 12 columns)
--   apps/provider/app/api/kyc/verify/route.ts  (kyc_status)
--   apps/provider/app/api/online/route.ts      (is_online, last_seen_at)
-- Client-scoped writes that must keep working are only the two account screens:
--   apps/customer/app/(dashboard)/account/page.tsx  -> full_name, phone
--   apps/provider/app/(app)/account/page.tsx        -> full_name, phone

revoke update on public.profiles from anon, authenticated;

-- ponytail: grant exactly the two columns the account screens write today. Widen
-- deliberately (e.g. avatar_url, bio) when a screen actually edits them — an unused
-- grant is indistinguishable from the hole this migration closes.
grant update (full_name, phone) on public.profiles to authenticated;

grant all on public.profiles to service_role;
