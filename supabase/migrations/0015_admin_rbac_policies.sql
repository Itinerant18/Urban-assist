-- Drop old generic admin select policy on profiles and create new granular one
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles
  for select using (
    id = auth.uid() 
    or (
      public.user_role() = 'admin' 
      and (
        public.admin_has_permission('manage_users') 
        or public.admin_has_permission('manage_providers') 
        or public.admin_has_permission('manage_kyc') 
        or public.admin_has_permission('manage_admins')
      )
    )
  );

-- Drop old generic admin select policy on provider_documents and create granular one
drop policy if exists "kyc docs admin read" on provider_documents;
create policy "kyc docs admin read" on provider_documents
  for select using (
    public.user_role() = 'admin' 
    and public.admin_has_permission('manage_kyc')
  );

-- Drop old generic admin select policy on bookings and create granular one
drop policy if exists "booking admin read" on bookings;
create policy "booking admin read" on bookings
  for select using (
    public.user_role() = 'admin' 
    and public.admin_has_permission('manage_bookings')
  );

-- Drop old generic admin policies on support_tickets and create granular ones
drop policy if exists "tickets admin read" on support_tickets;
create policy "tickets admin read" on support_tickets
  for select using (
    public.user_role() = 'admin' 
    and public.admin_has_permission('manage_tickets')
  );

drop policy if exists "tickets admin update" on support_tickets;
create policy "tickets admin update" on support_tickets
  for update using (
    public.user_role() = 'admin' 
    and public.admin_has_permission('manage_tickets')
  );

-- Drop old generic admin select policy on analytics_events and create granular one
drop policy if exists "analytics admin read" on analytics_events;
create policy "analytics admin read" on analytics_events
  for select using (
    public.user_role() = 'admin' 
    and public.admin_has_permission('view_audit_log')
  );
