-- Local demo fixtures. Runs on `supabase db reset` after migrations.
-- Catalog categories/promos already come from migration 0004_seed.sql.
-- Profiles are created by handle_new_user from auth.users meta.role.

begin;

-- ── Local grant baseline ────────────────────────────────────────────────────
-- Hosted Supabase grants anon/authenticated full DML by default; local roles.sql
-- (CLI 2.109) only leaves Truncate/References/Trigger/Maintain on tables created
-- by postgres. Without this, RLS policies exist but PostgREST returns 42501.
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- service_role is affected by the same local default. Hosted grants it full DML on
-- every public table; locally it was left with only Truncate/References/Trigger, so
-- anything server-side failed with 42501 — `pnpm bootstrap:admin` got as far as
-- creating the auth user and the profile, then died on admin_roles. Verified against
-- production: service_role holds DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Re-apply intentional locks from security migrations so RLS tests stay honest.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, bio, notification_prefs)
  on public.profiles to authenticated;
revoke insert, delete, truncate on public.profiles from anon, authenticated;

revoke insert, update, delete, truncate on public.service_categories from anon, authenticated;
revoke insert, update, delete, truncate on public.service_subcategories from anon, authenticated;
revoke insert, update, delete, truncate on public.service_skus from anon, authenticated;
revoke insert, update, delete, truncate on public.service_attributes from anon, authenticated;

-- ── Fixed IDs (stable across resets) ────────────────────────────────────────
-- providers: approved online + pending KYC
-- customers: two London addresses with real lat/lng

create extension if not exists pgcrypto;

-- ── Catalog: one subcategory + SKU under cleaning (needed for provider_services) ─
insert into public.service_subcategories (id, category_id, slug, name, description, sort_order)
select
  'b1000000-0000-4000-8000-000000000001'::uuid,
  c.id,
  'standard-clean',
  'Standard clean',
  'Regular home clean',
  1
from public.service_categories c
where c.slug = 'cleaning'
on conflict do nothing;

insert into public.service_skus (
  id, subcategory_id, slug, name, description,
  min_price_pence, max_price_pence, duration_mins, is_popular, is_active, sort_order
) values (
  'b2000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '2bed-flat',
  '2-bed flat clean',
  'Up to 2 bedrooms',
  4500,
  9000,
  120,
  true,
  true,
  1
) on conflict do nothing;

-- ── Auth users (phone OTP; test_otp → 123456) ───────────────────────────────
-- instance_id is the local GoTrue default.
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at, phone, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  is_sso_user, is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'provider.approved@example.com',
  crypt('password-not-used', gen_salt('bf')),
  now(), '447700900001', now(),
  '{"provider":"phone","providers":["phone"]}'::jsonb,
  '{"role":"provider","full_name":"Alex Rivera"}'::jsonb,
  now(), now(),
  '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated',
  'provider.pending@example.com',
  crypt('password-not-used', gen_salt('bf')),
  now(), '447700900002', now(),
  '{"provider":"phone","providers":["phone"]}'::jsonb,
  '{"role":"provider","full_name":"Sam Okonkwo"}'::jsonb,
  now(), now(),
  '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000003',
  'authenticated', 'authenticated',
  'customer.one@example.com',
  crypt('password-not-used', gen_salt('bf')),
  now(), '447700900003', now(),
  '{"provider":"phone","providers":["phone"]}'::jsonb,
  '{"role":"customer","full_name":"Jordan Lee"}'::jsonb,
  now(), now(),
  '', '', '', '',
  false, false
),
(
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000004',
  'authenticated', 'authenticated',
  'customer.two@example.com',
  crypt('password-not-used', gen_salt('bf')),
  now(), '447700900004', now(),
  '{"provider":"phone","providers":["phone"]}'::jsonb,
  '{"role":"customer","full_name":"Casey Nguyen"}'::jsonb,
  now(), now(),
  '', '', '', '',
  false, false
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
select
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'phone', u.phone),
  'phone',
  u.phone,
  now(), now(), now()
from auth.users u
where u.id in (
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000004'
)
on conflict do nothing;

-- ── Provider profile flags (trigger already inserted the rows) ──────────────
-- Seed runs as postgres with no JWT; guard_profile_protected_columns would block
-- kyc_status / registration_completed. Flip the trigger off for these trusted writes.
alter table public.profiles disable trigger guard_profile_protected_columns;

update public.profiles set
  kyc_status = 'approved',
  is_online = true,
  registration_completed = true,
  rating_avg = 4.80,
  rating_count = 3,
  acceptance_rate = 0.92,
  travel_radius_miles = 12,
  bio = 'Reliable cleaner across North London.',
  stripe_account_id = 'acct_local_demo_approved'
where id = 'a0000000-0000-4000-8000-000000000001';

update public.profiles set
  kyc_status = 'pending',
  is_online = false,
  registration_completed = false,
  bio = 'Awaiting KYC approval.'
where id = 'a0000000-0000-4000-8000-000000000002';

update public.profiles set registration_completed = true
where id in (
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000004'
);

alter table public.profiles enable trigger guard_profile_protected_columns;

-- ── Addresses (real London lat/lng) ─────────────────────────────────────────
insert into public.addresses (id, profile_id, label, line1, city, postcode, lat, lng, is_default) values
(
  'c1000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000003',
  'Home',
  '14 Upper Street',
  'London',
  'N1 0PQ',
  51.5380,
  -0.1025,
  true
),
(
  'c1000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000004',
  'Home',
  '22 Brixton Road',
  'London',
  'SW9 6DE',
  51.4635,
  -0.1122,
  true
)
on conflict do nothing;

-- ── Provider services + areas + schedule ────────────────────────────────────
insert into public.provider_services (
  id, provider_id, category_id, sku_id, title, price_pence, duration_mins, is_active
)
select
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  c.id,
  'b2000000-0000-4000-8000-000000000001'::uuid,
  '2-bed flat clean',
  1, -- overwritten by trg_provider_service_price from SKU
  120,
  true
from public.service_categories c
where c.slug = 'cleaning'
on conflict do nothing;

insert into public.provider_service_areas (provider_id, category_id, postcode_pattern)
select
  'a0000000-0000-4000-8000-000000000001'::uuid,
  c.id,
  'N1'
from public.service_categories c
where c.slug = 'cleaning'
on conflict do nothing;

insert into public.provider_service_areas (provider_id, category_id, postcode_pattern)
select
  'a0000000-0000-4000-8000-000000000002'::uuid,
  c.id,
  'SW9'
from public.service_categories c
where c.slug = 'cleaning'
on conflict do nothing;

-- Mon–Fri 09:00–17:00 for approved provider (weekday 1=Mon … 5=Fri; 0=Sun in schema)
insert into public.availability_slots (provider_id, weekday, start_time, end_time)
select 'a0000000-0000-4000-8000-000000000001'::uuid, d, '09:00'::time, '17:00'::time
from generate_series(1, 5) as d
on conflict do nothing;

insert into public.time_off (provider_id, start_date, end_date) values
(
  'a0000000-0000-4000-8000-000000000001',
  (current_date + 21),
  (current_date + 23)
)
on conflict do nothing;

-- ── Bookings across statuses ────────────────────────────────────────────────
-- Helpers: price 4500 + vat 900 = total 5400
insert into public.bookings (
  id, short_code, customer_id, provider_id, category_id, provider_service_id,
  service_sku_id, address_id, scheduled_at, status,
  price_pence, vat_pence, total_pence, payment_method,
  matched_at, started_at, completed_at, cancelled_at
)
select
  b.id, b.short_code, b.customer_id, b.provider_id, c.id,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'b2000000-0000-4000-8000-000000000001'::uuid,
  b.address_id, b.scheduled_at, b.status::public.booking_status,
  4500, 900, 5400, b.payment_method::public.payment_method,
  b.matched_at, b.started_at, b.completed_at, b.cancelled_at
from public.service_categories c
cross join (values
  (
    'e1000000-0000-4000-8000-000000000001'::uuid, 'ASSIGN01',
    'a0000000-0000-4000-8000-000000000003'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    now() + interval '2 days', 'assigned', 'card',
    now() - interval '1 hour', null::timestamptz, null::timestamptz, null::timestamptz
  ),
  (
    'e1000000-0000-4000-8000-000000000002'::uuid, 'ONWAY001',
    'a0000000-0000-4000-8000-000000000004'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000002'::uuid,
    now() + interval '3 hours', 'on_the_way', 'card',
    now() - interval '2 hours', null, null, null
  ),
  (
    'e1000000-0000-4000-8000-000000000003'::uuid, 'INPROG01',
    'a0000000-0000-4000-8000-000000000003'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    now() - interval '30 minutes', 'in_progress', 'cash',
    now() - interval '2 hours', now() - interval '20 minutes', null, null
  ),
  (
    'e1000000-0000-4000-8000-000000000004'::uuid, 'DONE0001',
    'a0000000-0000-4000-8000-000000000003'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    now() - interval '10 days', 'completed', 'card',
    now() - interval '10 days', now() - interval '10 days', now() - interval '10 days' + interval '2 hours', null
  ),
  (
    'e1000000-0000-4000-8000-000000000005'::uuid, 'DONE0002',
    'a0000000-0000-4000-8000-000000000004'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000002'::uuid,
    now() - interval '7 days', 'completed', 'card',
    now() - interval '7 days', now() - interval '7 days', now() - interval '7 days' + interval '2 hours', null
  ),
  (
    'e1000000-0000-4000-8000-000000000006'::uuid, 'DONE0003',
    'a0000000-0000-4000-8000-000000000003'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    now() - interval '3 days', 'completed', 'cash',
    now() - interval '3 days', now() - interval '3 days', now() - interval '3 days' + interval '2 hours', null
  ),
  (
    'e1000000-0000-4000-8000-000000000007'::uuid, 'CANCEL01',
    'a0000000-0000-4000-8000-000000000004'::uuid,
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000002'::uuid,
    now() - interval '1 day', 'cancelled', 'card',
    now() - interval '2 days', null, null, now() - interval '1 day'
  ),
  -- pending_match booking that backs the live offer
  (
    'e1000000-0000-4000-8000-000000000008'::uuid, 'OFFER001',
    'a0000000-0000-4000-8000-000000000003'::uuid,
    null::uuid,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    now() + interval '1 day', 'pending_match', 'card',
    null, null, null, null
  )
) as b(
  id, short_code, customer_id, provider_id, address_id,
  scheduled_at, status, payment_method,
  matched_at, started_at, completed_at, cancelled_at
)
where c.slug = 'cleaning'
on conflict (id) do nothing;

-- Live offer for approved provider (future responds_by)
insert into public.booking_offers (
  id, booking_id, provider_id, status, rank, offered_at, responds_by
) values (
  'f1000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000008',
  'a0000000-0000-4000-8000-000000000001',
  'pending',
  1,
  now(),
  now() + interval '15 minutes'
)
on conflict do nothing;

-- Payments for completed + in-progress cash job
insert into public.payments (id, booking_id, method, amount_pence, vat_pence, status, cash_collected_at) values
(
  'f2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000004',
  'card', 5400, 900, 'succeeded', null
),
(
  'f2000000-0000-4000-8000-000000000002',
  'e1000000-0000-4000-8000-000000000005',
  'card', 5400, 900, 'succeeded', null
),
(
  'f2000000-0000-4000-8000-000000000003',
  'e1000000-0000-4000-8000-000000000006',
  'cash', 5400, 900, 'succeeded', now() - interval '3 days'
),
(
  'f2000000-0000-4000-8000-000000000004',
  'e1000000-0000-4000-8000-000000000003',
  'cash', 5400, 900, 'pending', null
)
on conflict do nothing;

insert into public.payouts (
  id, provider_id, amount_pence, period_start, period_end, status, stripe_transfer_id
) values
(
  'f3000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  7200,
  (current_date - 14),
  (current_date - 7),
  'paid',
  'tr_local_demo_1'
),
(
  'f3000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  3600,
  (current_date - 7),
  current_date,
  'pending',
  null
)
on conflict do nothing;

-- Reviews on completed jobs (triggers recompute rating_avg)
insert into public.reviews (
  id, booking_id, author_id, target_id, direction, rating, comment
) values
(
  'f4000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'customer_to_provider',
  5,
  'Spotless — will book again.'
),
(
  'f4000000-0000-4000-8000-000000000002',
  'e1000000-0000-4000-8000-000000000005',
  'a0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000001',
  'customer_to_provider',
  5,
  'On time and thorough.'
),
(
  'f4000000-0000-4000-8000-000000000003',
  'e1000000-0000-4000-8000-000000000006',
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'customer_to_provider',
  4,
  'Great job, minor dust on skirting.'
)
on conflict do nothing;

commit;
