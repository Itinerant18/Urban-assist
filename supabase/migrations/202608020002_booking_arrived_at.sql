-- Record when a provider marks themselves as arrived.
--
-- bookings already stamps matched_at / started_at / completed_at / cancelled_at, but
-- the 'arrived' transition wrote no timestamp. The only other record of it is
-- booking_status_logs, which is admin-read-only ("Admins read booking status logs",
-- 202607210001), so the provider-facing on-time-arrival metric had no readable source.
--
-- Nullable with no backfill: historical bookings genuinely have no arrival time and
-- inventing one would poison the very metric this enables. On-time arrival reads as
-- "—" until jobs complete under this column.

alter table public.bookings
  add column if not exists arrived_at timestamptz;

comment on column public.bookings.arrived_at is
  'Set by updateJobStatus() on the arrived transition. Null for bookings that predate migration 202608020002.';
