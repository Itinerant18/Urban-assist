-- Double-click / back-after-success resubmission created duplicate bookings.
-- Same customer + same provider service + same slot while a prior attempt is
-- still live is always accidental — reject it at the database.
create unique index if not exists bookings_dedupe_active_idx
  on public.bookings (customer_id, provider_service_id, scheduled_at)
  where status in ('pending_match', 'unmatched', 'assigned', 'on_the_way', 'arrived', 'in_progress');
