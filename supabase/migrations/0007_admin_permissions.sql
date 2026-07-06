-- Admin permissions system
-- Granular admin role assignments beyond the base user_role enum

create table if not exists admin_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  can_manage_bookings boolean not null default false,
  can_manage_providers boolean not null default false,
  can_manage_users boolean not null default false,
  can_manage_kyc boolean not null default false,
  can_manage_tickets boolean not null default false,
  can_manage_payments boolean not null default false,
  can_manage_promo_codes boolean not null default false,
  can_view_audit_log boolean not null default false,
  can_manage_admins boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_permissions_profile_idx on admin_permissions(profile_id);

alter table admin_permissions enable row level security;

-- Admins can read their own permissions
create policy "admin_permissions self read" on admin_permissions
  for select using (profile_id = auth.uid());

-- Super-admins (with can_manage_admins) can read/manage all
create policy "admin_permissions super manage" on admin_permissions
  for all using (
    public.user_role() = 'admin'
    and exists (
      select 1 from admin_permissions ap
      where ap.profile_id = auth.uid() and ap.can_manage_admins = true
    )
  ) with check (
    public.user_role() = 'admin'
    and exists (
      select 1 from admin_permissions ap
      where ap.profile_id = auth.uid() and ap.can_manage_admins = true
    )
  );

-- ============================================================
-- Helper: check admin permission
-- ============================================================
create or replace function public.admin_has_permission(permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    case
      when not exists (select 1 from admin_permissions where profile_id = auth.uid()) then false
      when permission = 'manage_bookings' then (select can_manage_bookings from admin_permissions where profile_id = auth.uid())
      when permission = 'manage_providers' then (select can_manage_providers from admin_permissions where profile_id = auth.uid())
      when permission = 'manage_users' then (select can_manage_users from admin_permissions where profile_id = auth.uid())
      when permission = 'manage_kyc' then (select can_manage_kyc from admin_permissions where profile_id = auth.uid())
      when permission = 'manage_tickets' then (select can_manage_tickets from admin_permissions where profile_id = auth.uid())
      when permission = 'manage_payments' then (select can_manage_payments from admin_permissions where profile_id = auth.uid())
      when permission = 'manage_promo_codes' then (select can_manage_promo_codes from admin_permissions where profile_id = auth.uid())
      when permission = 'view_audit_log' then (select can_view_audit_log from admin_permissions where profile_id = auth.uid())
      when permission = 'manage_admins' then (select can_manage_admins from admin_permissions where profile_id = auth.uid())
      else false
    end
$$;

-- ============================================================
-- Helper: auto-create admin_permissions row when role='admin'
-- First admin created gets all permissions; subsequent get none
-- (super can grant via dashboard)
-- ============================================================
create or replace function public.handle_new_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' then
    insert into admin_permissions (profile_id, can_manage_admins)
    values (
      new.id,
      not exists (select 1 from profiles where role = 'admin' and id != new.id)
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_new_admin
  after insert or update of role on profiles
  for each row
  when (new.role = 'admin')
  execute function handle_new_admin();
