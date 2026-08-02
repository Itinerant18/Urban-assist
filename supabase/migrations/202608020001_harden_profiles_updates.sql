-- Restrict which profile columns a client may write.
--
-- Context, corrected after reading the deployed schema:
--
-- 202607220001 (guard_profile_protected_columns, applied to the remote but absent
-- from this repo) already installs a BEFORE UPDATE trigger that rejects non
-- service_role changes to role, kyc_status and registration_completed. Those three
-- are therefore NOT open, contrary to what a reading of this repo alone suggests.
--
-- What remains open is everything else. `information_schema.column_privileges` shows
-- both `authenticated` and `anon` holding UPDATE on every column of public.profiles,
-- and "update own profile" (0002_rls.sql:38) scopes that to the caller's own row with
-- no column restriction. RLS gates rows; it has never gated columns. So any signed-in
-- user can still set, on their own row:
--
--   rating_avg, rating_count   -- 30% of the matching score, and shown to customers
--   acceptance_rate            -- 20% of the matching score
--   is_blocked                 -- un-block themselves after moderation
--   stripe_account_id          -- redirect their payout destination
--   is_online, bank_*, nino, utr_number, date_of_birth, business_name, ...
--
-- Column-level GRANT is the Postgres-native fix and is strictly stronger than a
-- trigger: the privilege check happens before any row is examined. The existing
-- trigger stays as defence in depth for its three columns.
--
-- The allow-list is what a user legitimately owns about their own presentation and
-- preferences. Nothing here affects money, trust, ranking or verification:
--
--   full_name, phone      -- both account screens (customer + provider)
--   avatar_url            -- the avatars bucket exists as of 202607240001
--   bio                   -- provider self-description
--   notification_prefs    -- added by 202607230002 for a settings UI
--
-- Everything else is server-side only. Those writes already run through service-role
-- paths: /api/register, /api/online, /api/kyc/verify, and the Stripe Connect onboard
-- route. Rating and acceptance are maintained by triggers, not by any client.
--
-- `anon` is included in the revoke for hygiene. The RLS policy compares against
-- auth.uid(), which is null for anon, so it was not exploitable — but an unauthenticated
-- role holding UPDATE on a user table should not be sitting there regardless.

revoke update on public.profiles from anon, authenticated;

grant update (full_name, phone, avatar_url, bio, notification_prefs)
  on public.profiles to authenticated;

grant all on public.profiles to service_role;
