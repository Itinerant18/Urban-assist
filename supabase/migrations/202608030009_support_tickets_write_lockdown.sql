-- Clients create and read tickets; only staff mutate them (service role via
-- updateTicketStatus / assignTicket / ticket actions). Without this, the
-- table-level UPDATE grant plus the "tickets owner" FOR ALL policy let a
-- customer edit their own ticket's status / resolved_at / assigned_to.
revoke update, delete, truncate on public.support_tickets from anon, authenticated;
revoke insert on public.support_tickets from anon;
