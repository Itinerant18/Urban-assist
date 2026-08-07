-- ============================================================
-- HOMEASE COMBINED MIGRATION SCRIPT (0001 - 0005)
-- Copy and paste this script directly into the Supabase Dashboard SQL Editor
-- (https://supabase.com/dashboard/project/bkgoavguqwdbpycbnrky/sql)
-- to initialize the database schema, RLS, triggers, seed data, and buckets.
-- ============================================================

-- EXTENSIONS
create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- ENUMS
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
-- TABLES
-- ============================================================

-- PROFILES (one row per auth.user)
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
  acceptance_rate numeric(3,2) not null default 1.0,
  is_online boolean not null default false,
  stripe_account_id text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);
create index profiles_online_idx on profiles(is_online) where role = 'provider';

-- ADDRESSES
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

-- SERVICE CATALOG
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

-- PROVIDER OPERATIONAL DATA
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
  doc_type text not null,
  storage_path text not null,
  expires_at date,
  uploaded_at timestamptz not null default now()
);

create table provider_location (
  provider_id uuid primary key references profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

-- PROMO CODES
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null,
  max_redemptions integer,
  redemption_count integer not null default 0,
  expires_at timestamptz
);

-- BOOKINGS
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
  completion_report text,
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

-- MATCHING ENGINE — offers
create table booking_offers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider_id uuid not null references profiles(id) on delete cascade,
  status offer_status not null default 'pending',
  rank integer not null,
  offered_at timestamptz not null default now(),
  responds_by timestamptz not null,
  responded_at timestamptz,
  decline_reason text
);
create index offers_booking_idx on booking_offers(booking_id, rank);
create index offers_provider_pending_idx on booking_offers(provider_id, status) where status = 'pending';

-- PAYMENTS & PAYOUTS
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

-- REVIEWS, MESSAGES, NOTIFICATIONS
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

-- FAVORITES, SUPPORT, ANALYTICS
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

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table service_categories enable row level security;
alter table provider_services enable row level security;
alter table availability_slots enable row level security;
alter table time_off enable row level security;
alter table provider_documents enable row level security;
alter table provider_location enable row level security;
alter table promo_codes enable row level security;
alter table bookings enable row level security;
alter table booking_offers enable row level security;
alter table payments enable row level security;
alter table payouts enable row level security;
alter table reviews enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table fcm_tokens enable row level security;
alter table favorites enable row level security;
alter table support_tickets enable row level security;
alter table referrals enable row level security;
alter table analytics_events enable row level security;

-- Helper: current user's role
create or replace function public.user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- Policies
create policy "read own profile" on profiles for select using (id = auth.uid() or public.user_role() = 'admin');
create policy "read provider public fields" on profiles for select using (role = 'provider');
create policy "update own profile" on profiles for update using (id = auth.uid());
create policy "insert own profile" on profiles for insert with check (id = auth.uid());

create policy "owner addresses" on addresses for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "categories public read" on service_categories for select using (true);

create policy "provider services public read" on provider_services for select using (is_active = true);
create policy "provider services owner manage" on provider_services for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

create policy "availability owner" on availability_slots for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "time_off owner" on time_off for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

create policy "kyc docs owner" on provider_documents for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "kyc docs admin read" on provider_documents for select using (public.user_role() = 'admin');

create policy "provider location self" on provider_location for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "provider location matched customer" on provider_location for select using (
  exists (
    select 1 from bookings b
    where b.provider_id = provider_location.provider_id
      and b.customer_id = auth.uid()
      and b.status in ('assigned','on_the_way','arrived','in_progress')
  )
);

create policy "booking customer read" on bookings for select using (customer_id = auth.uid());
create policy "booking provider read" on bookings for select using (provider_id = auth.uid());
create policy "booking customer insert" on bookings for insert with check (customer_id = auth.uid());
create policy "booking customer update" on bookings for update using (customer_id = auth.uid());
create policy "booking provider update" on bookings for update using (provider_id = auth.uid());
create policy "booking admin read" on bookings for select using (public.user_role() = 'admin');

create policy "offers provider read" on booking_offers for select using (provider_id = auth.uid());
create policy "offers customer read" on booking_offers for select using (
  exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid())
);
create policy "offers provider respond" on booking_offers for update using (provider_id = auth.uid());

create policy "payments customer read" on payments for select using (
  exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid())
);
create policy "payments provider read" on payments for select using (
  exists (select 1 from bookings b where b.id = booking_id and b.provider_id = auth.uid())
);

create policy "payouts provider read" on payouts for select using (provider_id = auth.uid());

create policy "reviews public read" on reviews for select using (true);
create policy "reviews author insert" on reviews for insert with check (author_id = auth.uid());

create policy "messages participants" on messages for all using (
  exists (
    select 1 from bookings b
    where b.id = booking_id and (b.customer_id = auth.uid() or b.provider_id = auth.uid())
  )
) with check (sender_id = auth.uid());

create policy "notifications owner" on notifications for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "fcm tokens owner" on fcm_tokens for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "favorites owner" on favorites for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

create policy "tickets owner" on support_tickets for all using (raised_by = auth.uid()) with check (raised_by = auth.uid());
create policy "tickets admin read" on support_tickets for select using (public.user_role() = 'admin');
create policy "tickets admin update" on support_tickets for update using (public.user_role() = 'admin');

create policy "referrals owner read" on referrals for select using (owner_id = auth.uid());

create policy "analytics insert any auth" on analytics_events for insert with check (auth.uid() is not null);
create policy "analytics admin read" on analytics_events for select using (public.user_role() = 'admin');

create policy "promo public read" on promo_codes for select using (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile row when a new auth.user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Recompute a provider's rolling rating after any new review.
create or replace function recompute_rating()
returns trigger language plpgsql as $$
begin
  update profiles p
     set rating_avg = sub.avg, rating_count = sub.cnt
    from (
      select target_id, avg(rating)::numeric(3,2) as avg, count(*) as cnt
        from reviews where target_id = new.target_id group by target_id
    ) sub
   where p.id = sub.target_id;
  return new;
end;
$$;
drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
after insert on reviews
for each row execute function recompute_rating();

-- Recompute provider acceptance rate after each offer response.
create or replace function recompute_acceptance()
returns trigger language plpgsql as $$
declare a numeric;
begin
  if new.status in ('accepted','declined','expired') then
    select coalesce(
             sum(case when status='accepted' then 1 else 0 end)::numeric
             / nullif(count(*),0), 1.0)
      into a
      from booking_offers
     where provider_id = new.provider_id
       and offered_at > now() - interval '30 days';
    update profiles set acceptance_rate = coalesce(a,1.0) where id = new.provider_id;
  end if;
  return new;
end;
$$;
drop trigger if exists offers_recompute_acceptance on booking_offers;
create trigger offers_recompute_acceptance
after update on booking_offers
for each row execute function recompute_acceptance();

-- Touch bookings.matched_at when provider_id first set.
create or replace function bookings_touch_matched()
returns trigger language plpgsql as $$
begin
  if old.provider_id is null and new.provider_id is not null then
    new.matched_at := now();
    new.status := 'assigned';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_touch_matched_trg on bookings;
create trigger bookings_touch_matched_trg
before update on bookings
for each row execute function bookings_touch_matched();

-- ============================================================
-- SEED DATA
-- ============================================================

insert into service_categories (slug, name, icon, description, min_price_pence, max_price_pence, sort_order) values
  ('cleaning',          'Home cleaning',     'sparkles',   'Regular and deep cleaning for homes and flats', 1500, 15000, 1),
  ('plumbing',          'Plumbing',          'wrench',     'Leaks, blockages, installations and repairs',     3500, 30000, 2),
  ('electrical',        'Electrical',        'zap',        'Certified electrical work and safety checks',     4000, 40000, 3),
  ('gardening',         'Gardening',         'leaf',       'Lawn care, hedge trimming and garden tidy-ups',   2000, 20000, 4),
  ('appliance-repair',  'Appliance repair',  'settings',   'Washing machines, ovens, fridges and dryers',     3500, 25000, 5),
  ('handyman',          'Handyman',          'hammer',     'Small jobs around the house — mounting, fixing',  2500, 20000, 6),
  ('painting',          'Painting & decor',  'paintbrush', 'Interior and exterior decorating',                4000, 50000, 7),
  ('locksmith',         'Locksmith',         'lock',       'Lock-outs, lock changes and security upgrades',   5000, 30000, 8)
on conflict (slug) do nothing;

insert into promo_codes (code, discount_type, discount_value, expires_at) values
  ('WELCOME10', 'percent', 10, now() + interval '90 days'),
  ('FIRST5GBP', 'fixed',  500, now() + interval '90 days')
on conflict (code) do nothing;

-- ============================================================
-- STORAGE BUCKETS & POLICIES
-- ============================================================

insert into storage.buckets (id, name, public)
values ('completion', 'completion', true)
on conflict (id) do nothing;

drop policy if exists "completion public read" on storage.objects;
create policy "completion public read" on storage.objects
  for select using (bucket_id = 'completion');

drop policy if exists "completion provider insert" on storage.objects;
create policy "completion provider insert" on storage.objects
  for insert with check (
    bucket_id = 'completion'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );
