-- Audit log for sensitive operations
-- Tracks all admin actions and sensitive data changes for compliance

create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,           -- e.g. 'profile.role_changed', 'booking.cancelled', 'kyc.approved'
  entity_type text not null,      -- 'profile', 'booking', 'provider_document', etc.
  entity_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on audit_log(actor_id, created_at desc);
create index audit_log_entity_idx on audit_log(entity_type, entity_id, created_at desc);
create index audit_log_action_idx on audit_log(action, created_at desc);

alter table audit_log enable row level security;

-- Admins can read all audit logs
create policy "audit_log admin read" on audit_log
  for select using (public.user_role() = 'admin');

-- Service role can insert (called from server-side)
create policy "audit_log service_insert" on audit_log
  for insert with check (auth.role() = 'service_role');

-- ============================================================
-- TRIGGER: log profile role changes
-- ============================================================
create or replace function public.log_profile_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role is distinct from new.role then
    insert into audit_log (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
      auth.uid(),
      'profile.role_changed',
      'profile',
      new.id,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

create trigger trg_profile_role_change
  after update on profiles
  for each row
  when (old.role is distinct from new.role)
  execute function log_profile_role_change();

-- ============================================================
-- TRIGGER: log booking status changes
-- ============================================================
create or replace function public.log_booking_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into audit_log (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
      auth.uid(),
      'booking.status_changed',
      'booking',
      new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_booking_status_change
  after update on bookings
  for each row
  when (old.status is distinct from new.status)
  execute function log_booking_status_change();

-- ============================================================
-- TRIGGER: log payment status changes
-- ============================================================
create or replace function public.log_payment_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into audit_log (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
      auth.uid(),
      'payment.status_changed',
      'payment',
      new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_payment_status_change
  after update on payments
  for each row
  when (old.status is distinct from new.status)
  execute function log_payment_status_change();

-- ============================================================
-- TRIGGER: log KYC document changes
-- ============================================================
create or replace function public.log_kyc_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'kyc.uploaded'
      when tg_op = 'DELETE' then 'kyc.deleted'
      else 'kyc.updated'
    end,
    'provider_document',
    coalesce(new.id, old.id),
    case when tg_op = 'DELETE' then row_to_json(old)::jsonb else null end,
    case when tg_op = 'INSERT' then row_to_json(new)::jsonb else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_kyc_change
  after insert or update or delete on provider_documents
  for each row
  execute function log_kyc_change();
