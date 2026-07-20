-- Chat history is readable by booking participants but mutated only by API routes.

drop policy if exists "messages participants" on public.messages;

revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant all on public.messages to service_role;

create policy "messages participants read" on public.messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = messages.booking_id
        and (
          b.customer_id = (select auth.uid())
          or b.provider_id = (select auth.uid())
        )
    )
  );
