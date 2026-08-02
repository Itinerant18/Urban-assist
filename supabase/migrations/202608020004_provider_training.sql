-- Provider training checklist.
--
-- Deliberately not an LMS. No modules/lessons/quiz_attempts/scoring/certification
-- tables, because there is no course content to serve yet and an empty LMS is a
-- schema to migrate later for no benefit. This is: a catalogue of things a provider
-- should have done, and a record of which they have marked done.
--
-- Upgrade path when real content exists: add lessons + quiz_attempts keyed to
-- training_items, and gate provider_services insert on mandatory completions.
-- Nothing here blocks that.

create table if not exists public.training_items (
  id uuid primary key default gen_random_uuid(),
  -- Null category = applies to every provider regardless of what they offer.
  category_id uuid references public.service_categories(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 200),
  description text,
  content_url text,
  kind text not null default 'doc' check (kind in ('video', 'doc', 'in_person')),
  is_mandatory boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists training_items_lookup_idx
  on public.training_items (is_active, category_id, sort_order);

create table if not exists public.provider_training_completions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.training_items(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (provider_id, item_id)
);

create index if not exists provider_training_completions_provider_idx
  on public.provider_training_completions (provider_id);

alter table public.training_items enable row level security;
alter table public.provider_training_completions enable row level security;

-- Post-0017 convention: clients read, service-role writes. Column/table grants are
-- revoked so RLS is not the only thing standing between a provider and the data —
-- the profiles hole (202608020001) came from relying on RLS alone, which scopes rows
-- but never columns or verbs.
revoke all on public.training_items from anon, authenticated;
grant select on public.training_items to authenticated;
grant all on public.training_items to service_role;

revoke all on public.provider_training_completions from anon, authenticated;
grant select on public.provider_training_completions to authenticated;
grant all on public.provider_training_completions to service_role;

drop policy if exists "Anyone signed in reads active training items" on public.training_items;
create policy "Anyone signed in reads active training items"
on public.training_items for select to authenticated
using (is_active);

drop policy if exists "Providers read own training completions"
  on public.provider_training_completions;
create policy "Providers read own training completions"
on public.provider_training_completions for select to authenticated
using (provider_id = (select auth.uid()));

-- Seed: platform-wide induction items, not tied to a category. content_url is left
-- null on purpose — pointing at a URL that does not exist yet would be worse than
-- showing none, and the UI already handles a missing link.
insert into public.training_items (title, description, kind, is_mandatory, sort_order)
values
  ('Partner code of conduct',
   'How we expect partners to behave on a job: punctuality, appearance, communication and respecting the customer''s home.',
   'doc', true, 10),
  ('Health and safety basics',
   'Risk assessment before starting work, safe use of equipment, and when to stop and call it in.',
   'doc', true, 20),
  ('Using the Urban Assist Pro app',
   'Accepting offers, the 4-digit start code, updating job status, and completing with notes and a photo.',
   'doc', true, 30),
  ('Getting five-star reviews',
   'What customers consistently rate highly, and the most common reasons for a low rating.',
   'doc', false, 40),
  ('Handling difficult situations',
   'Customer not home, scope larger than booked, unsafe conditions, and payment disputes.',
   'doc', false, 50)
on conflict do nothing;
