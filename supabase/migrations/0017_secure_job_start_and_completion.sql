-- Secure provider job start codes and completion evidence storage.

create table if not exists public.booking_start_codes (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  code text not null check (code ~ '^\d{4}$'),
  created_at timestamptz not null default now()
);

create index if not exists booking_start_codes_customer_id_idx
  on public.booking_start_codes (customer_id);

alter table public.booking_start_codes enable row level security;
revoke all on public.booking_start_codes from anon, authenticated;
grant select on public.booking_start_codes to authenticated;
grant all on public.booking_start_codes to service_role;

drop policy if exists "start code customer read" on public.booking_start_codes;
create policy "start code customer read" on public.booking_start_codes
  for select to authenticated
  using (customer_id = (select auth.uid()));

create or replace function public.generate_booking_start_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  random_bytes bytea;
  code_number integer;
begin
  random_bytes := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  code_number := (get_byte(random_bytes, 0) * 256 + get_byte(random_bytes, 1)) % 10000;
  return lpad(code_number::text, 4, '0');
end;
$$;

create or replace function public.create_booking_start_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.booking_start_codes (booking_id, customer_id, code)
  values (new.id, new.customer_id, public.generate_booking_start_code())
  on conflict (booking_id) do nothing;
  return new;
end;
$$;

revoke all on function public.generate_booking_start_code() from public, anon, authenticated;
revoke all on function public.create_booking_start_code() from public, anon, authenticated;

drop trigger if exists bookings_create_start_code on public.bookings;
create trigger bookings_create_start_code
after insert on public.bookings
for each row execute function public.create_booking_start_code();

insert into public.booking_start_codes (booking_id, customer_id, code)
select
  b.id,
  b.customer_id,
  public.generate_booking_start_code()
from public.bookings b
on conflict (booking_id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'completion-photos',
  'completion-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Job state and completion evidence are mutated only by authenticated API routes
-- using the service role. Participant clients retain read-only access through RLS.
drop policy if exists "booking customer update" on public.bookings;
drop policy if exists "booking provider update" on public.bookings;
drop policy if exists "completion_photos provider insert" on storage.objects;

drop policy if exists "completion_photos participants read" on storage.objects;
create policy "completion_photos participants read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'completion-photos'
    and exists (
      select 1
      from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (
          b.customer_id = (select auth.uid())
          or b.provider_id = (select auth.uid())
        )
    )
  );
