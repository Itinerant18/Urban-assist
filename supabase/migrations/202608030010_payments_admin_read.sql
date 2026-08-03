-- Admins had no SELECT policy on payments (only customer/provider self-read),
-- so any admin-session read — the ticket refund panel, cross-entity search —
-- silently returned nothing. Same admin-read style as bookings and tickets;
-- writes stay service-role only.
create policy "payments admin read" on public.payments
  for select using (public.user_role() = 'admin');
