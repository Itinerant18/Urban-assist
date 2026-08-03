-- Dynamic pricing: region (postcode prefix) + time-of-day + optional category.
-- Applied as stacked percent adjustments on the platform SKU price at booking create.
-- Empty matching set = no change (commission UI unchanged).

create table if not exists public.pricing_modifiers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  postcode_prefix text,
  -- Local UK hour window [start_hour, end_hour). Null pair = all hours.
  -- Overnight allowed when start_hour > end_hour (e.g. 22 → 6).
  start_hour smallint check (start_hour is null or start_hour between 0 and 23),
  end_hour smallint check (end_hour is null or end_hour between 0 and 23),
  category_id uuid references public.service_categories(id) on delete cascade,
  -- e.g. 15 = +15%, -10 = −10%. Cap applied in app (±50 / +100).
  adjustment_percent numeric(6, 2) not null
    check (adjustment_percent >= -50 and adjustment_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_modifiers_hours_pair check (
    (start_hour is null and end_hour is null)
    or (start_hour is not null and end_hour is not null)
  )
);

create index if not exists pricing_modifiers_active_idx
  on public.pricing_modifiers (is_active)
  where is_active;

alter table public.pricing_modifiers enable row level security;
-- service_role bypasses RLS; no authenticated policies = admin-only via service role.

grant all on public.pricing_modifiers to service_role;

comment on table public.pricing_modifiers is
  'Region/time/category percent adjustments on platform SKU price at booking create.';
