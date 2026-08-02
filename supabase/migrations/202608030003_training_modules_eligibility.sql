-- Training fortification foundation (schema + completion tracking).
-- Extends 202608020004 checklist into modules with scores, soft assignments,
-- and category eligibility snapshots. Quizzes/gating enforcement come later;
-- this migration only records structure and eligibility for ops visibility.

-- ── training_items = modules ───────────────────────────────────────────
alter table public.training_items
  add column if not exists estimated_mins integer
    check (estimated_mins is null or estimated_mins between 1 and 480);

alter table public.training_items
  add column if not exists pass_score integer
    check (pass_score is null or pass_score between 0 and 100);

-- When true (and category_id set), completing this module is required for
-- soft "eligible for category" — admin/ops visibility first; hard job gating later.
alter table public.training_items
  add column if not exists gates_category boolean not null default false;

comment on column public.training_items.pass_score is
  'Null = mark-complete only. Set when a quiz is attached (future).';
comment on column public.training_items.gates_category is
  'If true with category_id, module must be completed for category eligibility snapshot.';

-- ── completions: scores + provenance ───────────────────────────────────
alter table public.provider_training_completions
  add column if not exists score numeric(5, 2)
    check (score is null or (score >= 0 and score <= 100));

alter table public.provider_training_completions
  add column if not exists source text not null default 'self_attested'
    check (source in ('self_attested', 'quiz', 'admin'));

alter table public.provider_training_completions
  add column if not exists updated_at timestamptz not null default now();

-- ── Soft assignments (admin/provider-specific) ─────────────────────────
create table if not exists public.provider_training_assignments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.training_items(id) on delete cascade,
  required boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  unique (provider_id, item_id)
);

create index if not exists provider_training_assignments_provider_idx
  on public.provider_training_assignments (provider_id);

alter table public.provider_training_assignments enable row level security;

revoke all on public.provider_training_assignments from anon, authenticated;
grant select on public.provider_training_assignments to authenticated;
grant all on public.provider_training_assignments to service_role;

drop policy if exists "Providers read own training assignments"
  on public.provider_training_assignments;
create policy "Providers read own training assignments"
on public.provider_training_assignments for select to authenticated
using (provider_id = (select auth.uid()));

-- ── Category eligibility snapshot ──────────────────────────────────────
create table if not exists public.provider_category_eligibility (
  provider_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  required_modules integer not null default 0 check (required_modules >= 0),
  completed_modules integer not null default 0 check (completed_modules >= 0),
  is_eligible boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (provider_id, category_id)
);

create index if not exists provider_category_eligibility_category_idx
  on public.provider_category_eligibility (category_id, is_eligible);

alter table public.provider_category_eligibility enable row level security;

revoke all on public.provider_category_eligibility from anon, authenticated;
grant select on public.provider_category_eligibility to authenticated;
grant all on public.provider_category_eligibility to service_role;

drop policy if exists "Providers read own category eligibility"
  on public.provider_category_eligibility;
create policy "Providers read own category eligibility"
on public.provider_category_eligibility for select to authenticated
using (provider_id = (select auth.uid()));

-- Recompute eligibility for one provider (all gated categories + their offered ones).
create or replace function public.refresh_provider_training_eligibility(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_required int;
  v_completed int;
begin
  -- Categories that either have gating modules or the provider already offers.
  for r in
    select distinct c.id as category_id
    from public.service_categories c
    where exists (
      select 1 from public.training_items ti
      where ti.category_id = c.id and ti.is_active and ti.gates_category
    )
    or exists (
      select 1 from public.provider_services ps
      where ps.provider_id = p_provider_id and ps.category_id = c.id
    )
  loop
    select
      count(*)::int,
      count(*) filter (
        where exists (
          select 1 from public.provider_training_completions ptc
          where ptc.provider_id = p_provider_id and ptc.item_id = ti.id
        )
      )::int
    into v_required, v_completed
    from public.training_items ti
    where ti.is_active
      and ti.category_id = r.category_id
      and ti.gates_category;

    insert into public.provider_category_eligibility as e (
      provider_id, category_id, required_modules, completed_modules, is_eligible, updated_at
    ) values (
      p_provider_id,
      r.category_id,
      coalesce(v_required, 0),
      coalesce(v_completed, 0),
      -- No gating modules ⇒ eligible. Otherwise all gating modules must be done.
      (coalesce(v_required, 0) = 0 or coalesce(v_completed, 0) >= coalesce(v_required, 0)),
      now()
    )
    on conflict (provider_id, category_id) do update set
      required_modules = excluded.required_modules,
      completed_modules = excluded.completed_modules,
      is_eligible = excluded.is_eligible,
      updated_at = excluded.updated_at;
  end loop;
end;
$$;

revoke all on function public.refresh_provider_training_eligibility(uuid) from public;
grant execute on function public.refresh_provider_training_eligibility(uuid) to service_role;

-- Keep updated_at fresh on completion upserts.
create or replace function public.touch_training_completion_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_training_completion on public.provider_training_completions;
create trigger trg_touch_training_completion
  before update on public.provider_training_completions
  for each row execute function public.touch_training_completion_updated_at();

-- High-risk category modules (AC + electrical). Content URLs stay null until material exists.
insert into public.training_items (
  category_id, title, description, kind, is_mandatory, gates_category, estimated_mins, sort_order
)
select c.id,
  'Electrical safety induction',
  'Safe isolation, PAT awareness, and when to refuse unsafe work. Required before Electrical jobs.',
  'doc', true, true, 25, 100
from public.service_categories c
where c.slug = 'electrical'
  and not exists (
    select 1 from public.training_items t
    where t.category_id = c.id and t.title = 'Electrical safety induction'
  );

insert into public.training_items (
  category_id, title, description, kind, is_mandatory, gates_category, estimated_mins, sort_order
)
select c.id,
  'Air conditioning service standards',
  'Safe handling of units, condensate, and customer briefing. Required before AC jobs.',
  'doc', true, true, 20, 100
from public.service_categories c
where c.slug = 'air-conditioning'
  and not exists (
    select 1 from public.training_items t
    where t.category_id = c.id and t.title = 'Air conditioning service standards'
  );
