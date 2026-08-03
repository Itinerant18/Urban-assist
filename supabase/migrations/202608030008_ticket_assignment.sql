-- Staff workload: tickets are assignable to an admin. Workload = open tickets
-- per admin + recent audit actions; both need this column to mean anything.
alter table public.support_tickets
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

create index if not exists support_tickets_assigned_to_idx
  on public.support_tickets(assigned_to)
  where assigned_to is not null;
