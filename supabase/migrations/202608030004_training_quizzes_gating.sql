-- Training quizzes + hard gating for high-risk categories (AC, electrical).
-- Builds on 202608030003: pass_score, gates_category, eligibility snapshots.

-- Allow quiz kind on training modules.
alter table public.training_items
  drop constraint if exists training_items_kind_check;
alter table public.training_items
  add constraint training_items_kind_check
  check (kind in ('video', 'doc', 'in_person', 'quiz'));

-- ── Quiz questions (correct answers never exposed to clients via RLS SELECT of
--    correct_index alone — providers read via service-role quiz API only for
--    prompts/options; scoring is server-side.) ───────────────────────────────
create table if not exists public.training_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.training_items(id) on delete cascade,
  prompt text not null check (length(btrim(prompt)) between 8 and 500),
  options jsonb not null
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_index integer not null check (correct_index >= 0 and correct_index <= 5),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint training_quiz_questions_correct_in_range check (
    correct_index < jsonb_array_length(options)
  )
);

create index if not exists training_quiz_questions_item_idx
  on public.training_quiz_questions (item_id, is_active, sort_order);

alter table public.training_quiz_questions enable row level security;

revoke all on public.training_quiz_questions from anon, authenticated;
-- Authenticated may not read rows (would leak correct_index). Service-role only.
grant all on public.training_quiz_questions to service_role;

-- Soft attempt log for ops / pass-rate instrumentation (optional cool-down later).
create table if not exists public.provider_training_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.training_items(id) on delete cascade,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  passed boolean not null,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provider_training_quiz_attempts_provider_idx
  on public.provider_training_quiz_attempts (provider_id, item_id, created_at desc);

alter table public.provider_training_quiz_attempts enable row level security;

revoke all on public.provider_training_quiz_attempts from anon, authenticated;
grant select on public.provider_training_quiz_attempts to authenticated;
grant all on public.provider_training_quiz_attempts to service_role;

drop policy if exists "Providers read own quiz attempts"
  on public.provider_training_quiz_attempts;
create policy "Providers read own quiz attempts"
on public.provider_training_quiz_attempts for select to authenticated
using (provider_id = (select auth.uid()));

-- Completions only count toward eligibility when score meets pass_score (if set).
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
          select 1
          from public.provider_training_completions ptc
          where ptc.provider_id = p_provider_id
            and ptc.item_id = ti.id
            and (
              ti.pass_score is null
              or (ptc.score is not null and ptc.score >= ti.pass_score)
            )
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

-- Assignment candidates: surface training eligibility (do not hide rows).
drop function if exists public.get_assignment_candidates(uuid);

create or replace function public.get_assignment_candidates(p_booking_id uuid)
returns table (
  provider_id uuid,
  full_name text,
  email text,
  rating numeric,
  completed_jobs bigint,
  cancellation_rate numeric,
  last_seen_at timestamptz,
  earnings_pence bigint,
  is_available boolean,
  is_preferred boolean,
  training_eligible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select
      b.id,
      b.category_id,
      b.scheduled_at,
      b.preferred_provider_id,
      upper(replace(a.postcode, ' ', '')) as postcode
    from public.bookings b
    join public.addresses a on a.id = b.address_id
    where b.id = p_booking_id
  ), provider_metrics as (
    select
      b.provider_id,
      count(*) filter (where b.status = 'completed') as completed_jobs,
      count(*) filter (where b.status = 'cancelled') as cancelled_jobs,
      count(*) filter (where b.status in ('completed', 'cancelled')) as terminal_jobs,
      coalesce(sum(b.total_pence) filter (where b.status = 'completed'), 0)::bigint as earnings_pence
    from public.bookings b
    where b.provider_id is not null
    group by b.provider_id
  )
  select distinct
    p.id,
    p.full_name,
    p.email,
    coalesce(p.rating_avg, 0)::numeric as rating,
    coalesce(pm.completed_jobs, 0) as completed_jobs,
    case when coalesce(pm.terminal_jobs, 0) = 0 then 0
      else round((pm.cancelled_jobs::numeric / pm.terminal_jobs::numeric) * 100, 2)
    end as cancellation_rate,
    p.last_seen_at,
    coalesce(pm.earnings_pence, 0),
    exists (
      select 1
      from public.availability_slots av
      where av.provider_id = p.id
        and av.weekday = (extract(isodow from t.scheduled_at)::integer - 1)
        and t.scheduled_at::time between av.start_time and av.end_time
    )
    and not exists (
      select 1
      from public.time_off off_period
      where off_period.provider_id = p.id
        and t.scheduled_at::date between off_period.start_date and off_period.end_date
    )
    and not exists (
      select 1
      from public.bookings busy
      where busy.provider_id = p.id
        and busy.status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
        and busy.scheduled_at between t.scheduled_at - interval '60 minutes'
                                  and t.scheduled_at + interval '60 minutes'
    ) as is_available,
    (t.preferred_provider_id is not null and p.id = t.preferred_provider_id) as is_preferred,
    (
      not exists (
        select 1 from public.training_items ti
        where ti.category_id = t.category_id
          and ti.is_active
          and ti.gates_category
      )
      or not exists (
        select 1 from public.training_items ti
        where ti.category_id = t.category_id
          and ti.is_active
          and ti.gates_category
          and not exists (
            select 1 from public.provider_training_completions ptc
            where ptc.provider_id = p.id
              and ptc.item_id = ti.id
              and (
                ti.pass_score is null
                or (ptc.score is not null and ptc.score >= ti.pass_score)
              )
          )
      )
    ) as training_eligible
  from target t
  join public.provider_services ps
    on ps.category_id = t.category_id and ps.is_active
  join public.profiles p
    on p.id = ps.provider_id
   and p.role = 'provider'
   and p.kyc_status = 'approved'
   and p.registration_completed
   and not p.is_blocked
  join public.provider_service_areas psa
    on psa.provider_id = p.id
   and (psa.category_id is null or psa.category_id = t.category_id)
   and t.postcode like upper(replace(psa.postcode_pattern, ' ', '')) || '%'
  left join provider_metrics pm on pm.provider_id = p.id
  order by
    training_eligible desc,
    (t.preferred_provider_id is not null and p.id = t.preferred_provider_id) desc,
    is_available desc,
    rating desc,
    completed_jobs desc,
    p.id;
$$;

revoke all on function public.get_assignment_candidates(uuid) from public;
grant execute on function public.get_assignment_candidates(uuid) to service_role;

-- Promote seeded AC / electrical modules to quiz with 80% pass.
update public.training_items ti
set
  kind = 'quiz',
  pass_score = 80,
  gates_category = true,
  is_mandatory = true,
  estimated_mins = coalesce(ti.estimated_mins, 15),
  description = coalesce(
    ti.description,
    'Pass the safety quiz (80%+) before accepting jobs in this category.'
  )
from public.service_categories c
where ti.category_id = c.id
  and c.slug in ('electrical', 'air-conditioning')
  and ti.gates_category = true;

-- ── Electrical quiz (8 MCQs) ─────────────────────────────────────────────
insert into public.training_quiz_questions (item_id, prompt, options, correct_index, sort_order)
select ti.id, q.prompt, q.options::jsonb, q.correct_index, q.sort_order
from public.training_items ti
join public.service_categories c on c.id = ti.category_id
cross join lateral (
  values
    (10, 'Before working on a circuit, what is the first safe isolation step?',
     '["Switch off the consumer unit and prove dead with a tested voltage indicator","Ask the customer if the power is off","Unplug nearby appliances only","Cover the fuse with tape"]', 0),
    (20, 'A customer asks you to just tape over a damaged cable until next week. You should:',
     '["Refuse unsafe work and explain the risk clearly","Tape it and book a follow-up","Charge extra and proceed","Leave a note and leave the premises"]', 0),
    (30, 'PAT awareness means you should:',
     '["Check for damage and refuse to use unsafe portable equipment","Only test brand-new tools","Ignore labels if the tool looks fine","Rely solely on the customer''s assurance"]', 0),
    (40, 'If you find aluminium wiring you are not competent to work on, you should:',
     '["Stop, make safe if needed, and escalate / refer","Carry on carefully with plastic connectors","Replace with copper immediately","Ignore it if lights still work"]', 0),
    (50, 'When should you refuse to start electrical work?',
     '["When conditions are unsafe or outside your competence","Only when the customer is rude","Never — always find a workaround","Only after a second visit"]', 0),
    (60, 'Customer handling: the booked scope is a socket swap but they ask for a full consumer-unit change mid-job. You should:',
     '["Pause, explain the change of scope, and get a new quote / booking","Do it for free to get a five-star review","Agree verbally and invoice later without noting it","Ignore the request and finish quickly"]', 0),
    (70, 'Which is the safest response to a warm / buzzing consumer unit?',
     '["Do not open or work on it; advise urgent specialist attention","Spray contact cleaner and continue","Tighten breakers while live","Leave it — warmth is normal"]', 0),
    (80, 'After finishing, you should:',
     '["Restore covers, remove debris, brief the customer on any limitations","Leave tools for the customer to tidy","Switch everything off at the street fuse","Skip photos if you are running late"]', 0)
) as q(sort_order, prompt, options, correct_index)
where c.slug = 'electrical'
  and ti.title = 'Electrical safety induction'
  and not exists (
    select 1 from public.training_quiz_questions x where x.item_id = ti.id
  );

-- ── Air conditioning quiz (8 MCQs) ───────────────────────────────────────
insert into public.training_quiz_questions (item_id, prompt, options, correct_index, sort_order)
select ti.id, q.prompt, q.options::jsonb, q.correct_index, q.sort_order
from public.training_items ti
join public.service_categories c on c.id = ti.category_id
cross join lateral (
  values
    (10, 'Before servicing an indoor unit, you should first:',
     '["Isolate power and confirm the unit is safe to open","Spray cleaner while the fan runs","Ask the customer to hold the cover","Bleed refrigerant immediately"]', 0),
    (20, 'Condensate is dripping onto the customer''s wall. Best first action:',
     '["Stop, protect the area, clear/check the drain path safely","Ignore it if cooling still works","Tell them to put a towel down and finish later","Increase fan speed to dry it"]', 0),
    (30, 'If you suspect a refrigerant leak and you are not F-gas qualified for the work:',
     '["Do not handle refrigerant; make safe and escalate","Top up with whatever gas is available","Vent to atmosphere outdoors","Seal with silicone and continue"]', 0),
    (40, 'Customer briefing after an AC service should include:',
     '["What was done, any limits, and filter / usage tips","Only the invoice total","Nothing — email is enough","A guarantee of zero future faults"]', 0),
    (50, 'Outdoor unit blocked by debris and poor airflow. You should:',
     '["Clear safely and explain airflow needs to the customer","Leave it — outdoors is the customer''s problem","Cover it with plastic for weather","Run on max cool to compensate"]', 0),
    (60, 'Which is unsafe during coil cleaning?',
     '["Working on a live electrical section of the unit","Using manufacturer-approved cleaner with power isolated","Wearing eye protection","Protecting soft furnishings"]', 0),
    (70, 'Booked job is a standard clean; customer wants a full refrigerant recharge mid-visit. You should:',
     '["Explain scope change, legality/competence, and re-quote if appropriate","Do it quietly to keep the booking short","Refuse all conversation and leave","Promise a free recharge next month"]', 0),
    (80, 'Before leaving an AC job you should:',
     '["Confirm unit runs, tidy the area, and note any remaining risks","Leave panels open for the customer to check","Disable safety switches so it cools harder","Skip photos if the customer is happy"]', 0)
) as q(sort_order, prompt, options, correct_index)
where c.slug = 'air-conditioning'
  and ti.title = 'Air conditioning service standards'
  and not exists (
    select 1 from public.training_quiz_questions x where x.item_id = ti.id
  );
