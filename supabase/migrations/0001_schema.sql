-- HomeEase core schema
-- Run with: supabase db push
-- All money columns are integers in pence (avoid float).

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('customer', 'provider', 'admin');
create type booking_status as enum (
  'pending_match', 'assigned', 'on_the_way', 'arrived',
  'in_progress', 'completed', 'cancelled', 'unmatched', 'disputed'
);
create type offer_status as enum ('pending', 'accepted', 'declined', 'expired');
create type payment_method as enum ('card', 'cash');
create type payment_status as enum ('pending', 'authorized', 'succeeded', 'failed', 'refunded');
create type payout_status as enum ('pending', 'paid', 'failed');
create type kyc_status as enum ('pending', 'approved', 'rejected');
create type review_direction as enum ('customer_to_provider', 'provider_to_customer');
create type ticket_status as enum ('open', 'in_review', 'resolved', 'closed');

-- ============================================================
-- PROFILES (one row per auth.user)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  email text,
  phone text,
  avatar_url text,
  kyc_status kyc_status not null default 'pending',
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  acceptance_rate numeric(3,2) not null default 1.0, -- providers
  is_online boolean not null default false,          -- providers
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);
create index profiles_online_idx on profiles(is_online) where role = 'provider';

-- ============================================================
-- ADDRESSES
-- ============================================================
create table addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text not null default 'Home',
  line1 text not null,
  line2 text,
  city text not null,
  postcode text not null,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_profile_idx on addresses(profile_id);

-- ============================================================
-- SERVICE CATALOG
-- ============================================================
create table service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  icon text,
  description text,
  min_price_pence integer not null default 1000,
  max_price_pence integer not null default 50000,
  sort_order integer not null default 0
);

create table provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references service_categories(id),
  title text not null,
  price_pence integer not null,
  duration_mins integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_id, category_id)
);
create index provider_services_category_idx on provider_services(category_id, is_active);

-- ============================================================
-- PROVIDER OPERATIONAL DATA
-- ============================================================
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);

create table time_off (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null
);

create table provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles(id) on delete cascade,
  doc_type text not null,           -- 'id', 'insurance', 'certification'
  storage_path text not null,       -- in supabase storage bucket 'provider_documents'
  expires_at date,
  uploaded_at timestamptz not null default now()
);

create table provider_location (
  provider_id uuid primary key references profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROMO CODES
-- ============================================================
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null,   -- percent (0-100) or pence
  max_redemptions integer,
  redemption_count integer not null default 0,
  expires_at timestamptz
);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null default upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 8)),
  customer_id uuid not null references profiles(id),
  provider_id uuid references profiles(id),
  category_id uuid not null references service_categories(id),
  provider_service_id uuid references provider_services(id),
  address_id uuid not null references addresses(id),
  scheduled_at timestamptz not null,
  status booking_status not null default 'pending_match',
  price_pence integer not null,
  vat_pence integer not null,
  total_pence integer not null,
  payment_method payment_method not null,
  promo_code_id uuid references promo_codes(id),
  notes text,
  created_at timestamptz not null default now(),
  matched_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
);
create index bookings_customer_idx on bookings(customer_id, created_at desc);
create index bookings_provider_idx on bookings(provider_id, scheduled_at);
create index bookings_status_idx on bookings(status);

-- ============================================================
-- MATCHING ENGINE — offers
-- ============================================================
create table booking_offers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider_id uuid not null references profiles(id) on delete cascade,
  status offer_status not null default 'pending',
  rank integer not null,                     -- cascade order
  offered_at timestamptz not null default now(),
  responds_by timestamptz not null,          -- TTL deadline
  responded_at timestamptz,
  decline_reason text
);
create index offers_booking_idx on booking_offers(booking_id, rank);
create index offers_provider_pending_idx on booking_offers(provider_id, status) where status = 'pending';

-- ============================================================
-- PAYMENTS & PAYOUTS
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  method payment_method not null,
  stripe_payment_intent_id text,
  amount_pence integer not null,
  vat_pence integer not null,
  status payment_status not null default 'pending',
  cash_collected_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_booking_idx on payments(booking_id);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references profiles(id) on delete cascade,
  stripe_transfer_id text,
  amount_pence integer not null,
  period_start date not null,
  period_end date not null,
  status payout_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================================
-- REVIEWS, MESSAGES, NOTIFICATIONS
-- ============================================================
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  author_id uuid not null references profiles(id),
  target_id uuid not null references profiles(id),
  direction review_direction not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, direction)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index messages_booking_idx on messages(booking_id, created_at);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_unread_idx on notifications(profile_id, read_at);

create table fcm_tokens (
  token text primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  device text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- FAVORITES, SUPPORT, ANALYTICS
-- ============================================================
create table favorites (
  customer_id uuid not null references profiles(id) on delete cascade,
  provider_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, provider_id)
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  raised_by uuid not null references profiles(id),
  category text not null,
  description text not null,
  status ticket_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  redeemed_by uuid references profiles(id),
  redeemed_at timestamptz,
  credit_pence integer not null default 500
);

create table analytics_events (
  id bigserial primary key,
  profile_id uuid references profiles(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_type_idx on analytics_events(type, created_at desc);
