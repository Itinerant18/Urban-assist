-- Reviews are immutable, server-authored records for completed booking participants.

alter table public.reviews
  drop constraint if exists reviews_comment_length_check;
alter table public.reviews
  add constraint reviews_comment_length_check
  check (comment is null or char_length(comment) <= 2000);

create index if not exists reviews_target_created_idx
  on public.reviews (target_id, created_at desc);

drop policy if exists "reviews author insert" on public.reviews;
revoke insert, update, delete on public.reviews from authenticated;
grant select on public.reviews to anon, authenticated;
grant all on public.reviews to service_role;

create or replace function public.validate_review_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_customer uuid;
  booking_provider uuid;
  booking_state public.booking_status;
begin
  select customer_id, provider_id, status
    into booking_customer, booking_provider, booking_state
  from public.bookings
  where id = new.booking_id;

  if not found or booking_state <> 'completed' then
    raise exception using errcode = '23514', message = 'review_booking_not_completed';
  end if;

  if new.direction = 'customer_to_provider' then
    if new.author_id is distinct from booking_customer
      or new.target_id is distinct from booking_provider then
      raise exception using errcode = '23514', message = 'review_participant_mismatch';
    end if;
  elsif new.direction = 'provider_to_customer' then
    if new.author_id is distinct from booking_provider
      or new.target_id is distinct from booking_customer then
      raise exception using errcode = '23514', message = 'review_participant_mismatch';
    end if;
  else
    raise exception using errcode = '23514', message = 'review_direction_invalid';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_review_participants()
  from public, anon, authenticated;

drop trigger if exists reviews_validate_participants on public.reviews;
create trigger reviews_validate_participants
before insert on public.reviews
for each row execute function public.validate_review_participants();

create or replace function public.recompute_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set rating_avg = coalesce(
        (select avg(r.rating)::numeric(3,2) from public.reviews r where r.target_id = new.target_id),
        0
      ),
      rating_count = (
        select count(*)::integer from public.reviews r where r.target_id = new.target_id
      )
  where id = new.target_id;
  return new;
end;
$$;

revoke all on function public.recompute_rating()
  from public, anon, authenticated;

drop trigger if exists reviews_recompute_rating on public.reviews;
create trigger reviews_recompute_rating
after insert on public.reviews
for each row execute function public.recompute_rating();
