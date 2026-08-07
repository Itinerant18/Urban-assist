-- Fix a lock-order inversion between claim_booking_for_provider and
-- admin_assign_booking, and stop depending on a trigger for the state the overlap
-- guard reads.
--
-- 1. DEADLOCK. admin_assign_booking (202608030002:36-38 then :51) takes the booking row
--    lock FIRST and the per-provider advisory lock SECOND. claim_booking_for_provider
--    (202608070003) did the opposite. When an ops admin assigns booking X to provider P
--    while P accepts the offer for X, the two transactions each hold what the other
--    wants and Postgres aborts one with 40P01 after deadlock_timeout:
--
--      ERROR: deadlock detected
--      Process A waits for ShareLock on transaction ...; blocked by process B.
--      Process B waits for ExclusiveLock on advisory lock ...; blocked by process A.
--
--    Neither caller maps 40P01, so the provider saw 400 {"error":"deadlock detected"}
--    and the admin path 500'd. Reordering to match admin_assign_booking removes the
--    cycle. Correctness is unchanged: the conflict check and the UPDATE both still run
--    while the advisory lock is held, so two overlapping claims for the same provider
--    remain serialised, and READ COMMITTED gives the post-lock statements a fresh
--    snapshot that sees the other transaction's committed row.
--
-- 2. The UPDATE now sets status and matched_at explicitly instead of relying on the
--    BEFORE UPDATE trigger bookings_touch_matched (0003_triggers.sql:64-76). The trigger
--    still works, but provider_has_conflicting_booking filters on
--    status in ('assigned', ...) -- so if that trigger were ever dropped or altered,
--    claimed bookings would stay 'pending_match', become invisible to the busy check,
--    and the overlap guard would silently stop working with no error anywhere.
--    admin_assign_booking (202608030002:88-92) already sets all three columns.

create or replace function public.claim_booking_for_provider(
  p_booking_id uuid,
  p_provider_id uuid
)
returns table (
  id uuid,
  customer_id uuid,
  provider_id uuid,
  status public.booking_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scheduled_at timestamptz;
begin
  -- Row lock first, matching admin_assign_booking's acquisition order.
  select b.scheduled_at into v_scheduled_at
  from public.bookings b
  where b.id = p_booking_id
    and b.provider_id is null
    and b.status in ('pending_match', 'unmatched')
  for update;

  -- Not claimable (already taken, cancelled, rescheduled away). Zero rows lets the
  -- caller expire the offer, matching the compare-and-swap this replaced.
  if not found then
    return;
  end if;

  -- Then the per-provider lock, so two overlapping offers cannot both pass the
  -- conflict check below. Same key as admin_assign_booking.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_provider_id::text, 0));

  if public.provider_has_conflicting_booking(p_provider_id, v_scheduled_at, p_booking_id) then
    raise exception 'provider_schedule_conflict' using errcode = 'P0001';
  end if;

  return query
  update public.bookings b
  set provider_id = p_provider_id,
      status = 'assigned',
      matched_at = now()
  where b.id = p_booking_id
    and b.provider_id is null
    and b.status in ('pending_match', 'unmatched')
  returning b.id, b.customer_id, b.provider_id, b.status;
end;
$$;

revoke all on function public.claim_booking_for_provider(uuid, uuid) from public;
grant execute on function public.claim_booking_for_provider(uuid, uuid) to service_role;
