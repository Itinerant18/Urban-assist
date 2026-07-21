-- Service SKU hierarchy: category → subcategory → sku (+ attributes).
-- Moves the catalog that currently lives static in apps/customer/lib/services-data.ts
-- into the DB so admins can edit it. Additive and backward-compatible: the new
-- FK columns on bookings/provider_services are nullable, so the existing
-- category-based booking flow keeps working unchanged until each later phase cuts
-- over. Catalog tables are publicly readable (browse is public), writable only by
-- service_role (admin).

create table if not exists public.service_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  unique (category_id, slug)
);

create table if not exists public.service_skus (
  id uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references public.service_subcategories(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  min_price_pence integer not null default 0,
  max_price_pence integer not null default 0,
  duration_mins integer,
  is_popular boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  unique (subcategory_id, slug)
);

create table if not exists public.service_attributes (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.service_skus(id) on delete cascade,
  key text not null,
  label text not null,
  input_type text not null default 'text',   -- 'text' | 'number' | 'select' | 'boolean'
  options jsonb,
  required boolean not null default false,
  sort_order integer not null default 0,
  unique (sku_id, key)
);

create index if not exists service_subcategories_category_idx on public.service_subcategories (category_id);
create index if not exists service_skus_subcategory_idx on public.service_skus (subcategory_id);
create index if not exists service_attributes_sku_idx on public.service_attributes (sku_id);

-- Additive links. Nullable → the current category-based flow is unaffected.
alter table public.bookings add column if not exists service_sku_id uuid references public.service_skus(id);
alter table public.provider_services add column if not exists sku_id uuid references public.service_skus(id);

-- Public catalog reads; admin (service_role) writes.
alter table public.service_subcategories enable row level security;
alter table public.service_skus enable row level security;
alter table public.service_attributes enable row level security;

drop policy if exists "catalog subcategories readable" on public.service_subcategories;
create policy "catalog subcategories readable" on public.service_subcategories for select to anon, authenticated using (true);
drop policy if exists "catalog skus readable" on public.service_skus;
create policy "catalog skus readable" on public.service_skus for select to anon, authenticated using (true);
drop policy if exists "catalog attributes readable" on public.service_attributes;
create policy "catalog attributes readable" on public.service_attributes for select to anon, authenticated using (true);

grant select on public.service_subcategories, public.service_skus, public.service_attributes to anon, authenticated;
grant all on public.service_subcategories, public.service_skus, public.service_attributes to service_role;
