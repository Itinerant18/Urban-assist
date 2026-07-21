-- Fix service_role detection in admin RPCs.
-- The original 202607210001 used current_setting('request.jwt.claim.role'),
-- a PostgREST GUC that is NULL on current Supabase — so service-role callers
-- (the admin app always uses createServiceRole()) failed the actor guard with
-- 'actor_mismatch'. Replaced with auth.jwt() ->> 'role', which reads the live
-- request.jwt.claims. Bodies are otherwise identical; create-or-replace keeps
-- existing grants.

create or replace function public.append_admin_action_log(
  p_actor_user_id uuid,
  p_actor_role_code text,
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_context jsonb default '{}'::jsonb,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_actor_role text;
begin
  if not public.is_admin_user(p_actor_user_id) then raise exception 'forbidden'; end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;

  select ar.code into v_actor_role
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_actor_user_id
    and (p_actor_role_code is null or ar.code = p_actor_role_code)
  order by case ar.code
    when 'super_admin' then 1
    when 'ops_admin' then 2
    when 'finance_admin' then 3
    when 'support_agent' then 4
    else 5
  end
  limit 1;

  if v_actor_role is null then raise exception 'actor_role_mismatch'; end if;

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id,
    context, ip_address, user_agent
  ) values (
    p_actor_user_id, v_actor_role, p_action_type, p_entity_type, p_entity_id,
    coalesce(p_context, '{}'::jsonb), p_ip_address, p_user_agent
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_admin_action_logs(
  p_actor_user_id uuid,
  p_action_type text default null,
  p_entity_type text default null,
  p_actor_filter uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id bigint,
  actor_user_id uuid,
  actor_role_code text,
  action_type text,
  entity_type text,
  entity_id uuid,
  context jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_user(p_actor_user_id) then raise exception 'forbidden'; end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;

  return query
  select
    aal.id, aal.actor_user_id, aal.actor_role_code, aal.action_type,
    aal.entity_type, aal.entity_id, aal.context, aal.ip_address,
    aal.user_agent, aal.created_at
  from audit.admin_action_logs aal
  where (p_action_type is null or aal.action_type = p_action_type)
    and (p_entity_type is null or aal.entity_type = p_entity_type)
    and (p_actor_filter is null or aal.actor_user_id = p_actor_filter)
    and (p_from is null or aal.created_at >= p_from)
    and (p_to is null or aal.created_at <= p_to)
  order by aal.created_at desc, aal.id desc
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.set_admin_user_roles(
  p_target_user_id uuid,
  p_role_codes text[],
  p_actor_user_id uuid
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_roles text[];
  v_old_roles text[];
  v_valid_count integer;
begin
  if not public.has_admin_role(p_actor_user_id, 'super_admin') then
    raise exception 'forbidden';
  end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;

  select array_agg(distinct code order by code) into v_roles
  from unnest(coalesce(p_role_codes, array[]::text[])) code;
  if coalesce(cardinality(v_roles), 0) = 0 then raise exception 'admin_requires_role'; end if;

  select count(*) into v_valid_count
  from public.admin_roles where code = any(v_roles);
  if v_valid_count <> cardinality(v_roles) then raise exception 'invalid_admin_role'; end if;
  if p_target_user_id = p_actor_user_id and not ('super_admin' = any(v_roles)) then
    raise exception 'cannot_remove_own_super_admin_role';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_target_user_id and role = 'admin'
  ) then raise exception 'admin_profile_not_found'; end if;

  select array_agg(ar.code order by ar.code) into v_old_roles
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_target_user_id;

  delete from public.admin_user_roles where user_id = p_target_user_id;
  insert into public.admin_user_roles (user_id, role_id, created_by)
  select p_target_user_id, ar.id, p_actor_user_id
  from public.admin_roles ar
  where ar.code = any(v_roles);

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id, context
  ) values (
    p_actor_user_id, 'super_admin', 'SET_ADMIN_ROLES', 'admin_user',
    p_target_user_id, jsonb_build_object(
      'previous_roles', coalesce(to_jsonb(v_old_roles), '[]'::jsonb),
      'roles', to_jsonb(v_roles)
    )
  );
  return v_roles;
end;
$$;

create or replace function public.admin_assign_booking(
  p_booking_id uuid,
  p_provider_id uuid,
  p_actor_user_id uuid,
  p_strategy text default 'manual_admin',
  p_reason text default null,
  p_generate_otp boolean default true,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_previous_provider_id uuid;
  v_action_type text;
  v_actor_role text;
  v_otp text;
  v_requires_otp boolean;
  v_candidate record;
  v_firebase_outbox_id uuid;
begin
  if p_strategy not in ('manual_admin', 'ml_recommendation') then
    raise exception 'unsupported_assignment_strategy';
  end if;

  if not public.is_admin_user(p_actor_user_id)
    or not (
      public.has_admin_role(p_actor_user_id, 'super_admin')
      or public.has_admin_role(p_actor_user_id, 'ops_admin')
    ) then
    raise exception 'forbidden';
  end if;

  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.status not in ('pending_match', 'unmatched', 'assigned', 'cancelled') then
    raise exception 'booking_not_assignable';
  end if;
  if v_booking.provider_id = p_provider_id then
    raise exception 'provider_already_assigned';
  end if;

  -- Serialize assignments for a provider so two admins cannot double-book the
  -- same availability window in concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended(p_provider_id::text, 0));

  select * into v_candidate
  from public.get_assignment_candidates(p_booking_id)
  where provider_id = p_provider_id and is_available;
  if not found then raise exception 'provider_not_eligible_or_available'; end if;

  v_previous_provider_id := v_booking.provider_id;
  v_action_type := case when v_previous_provider_id is null
    then 'ASSIGN_PROVIDER' else 'REASSIGN_PROVIDER' end;
  if v_previous_provider_id is not null and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reassignment_reason_required';
  end if;

  if v_previous_provider_id is not null and nullif(btrim(p_reason), '') is null then
    raise exception 'reassignment_reason_required';
  end if;

  select ar.code into v_actor_role
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_actor_user_id
  order by case ar.code
    when 'super_admin' then 1 when 'ops_admin' then 2 else 9 end
  limit 1;

  update public.bookings
  set provider_id = p_provider_id,
      status = 'assigned',
      matched_at = now()
  where id = p_booking_id;

  update public.booking_offers
  set status = 'expired', responded_at = now()
  where booking_id = p_booking_id and status = 'pending';

  insert into public.booking_status_logs (
    booking_id, from_status, to_status, previous_provider_id, provider_id,
    action_type, reason, strategy, admin_user_id, context
  ) values (
    p_booking_id, v_booking.status::text, 'assigned', v_previous_provider_id,
    p_provider_id, v_action_type, p_reason, p_strategy, p_actor_user_id,
    jsonb_build_object('scheduled_at', v_booking.scheduled_at)
  );

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id,
    context, ip_address, user_agent
  ) values (
    p_actor_user_id, v_actor_role, v_action_type, 'booking', p_booking_id,
    jsonb_build_object(
      'strategy', p_strategy,
      'reason', p_reason,
      'previous_provider_id', v_previous_provider_id,
      'provider_id', p_provider_id
    ), p_ip_address, p_user_agent
  );

  select requires_start_otp into v_requires_otp
  from public.service_categories where id = v_booking.category_id;

  if p_generate_otp and coalesce(v_requires_otp, true) then
    update public.otp_verifications
    set invalidated_at = now()
    where booking_id = p_booking_id
      and purpose = 'job_start'
      and verified_at is null
      and invalidated_at is null;

    v_otp := lpad((floor(random() * 10000))::integer::text, 4, '0');
    insert into public.otp_verifications (
      booking_id, purpose, code_hash, expires_at, created_by
    ) values (
      p_booking_id, 'job_start', encode(public.digest(v_otp, 'sha256'), 'hex'),
      greatest(v_booking.scheduled_at + interval '4 hours', now() + interval '4 hours'),
      p_actor_user_id
    );

    -- Keep the existing provider job-start verifier operational while the
    -- newer hashed verification table becomes the canonical audit record.
    insert into public.booking_start_codes (
      booking_id, code, customer_id, expires_at, attempt_count,
      consumed_at, last_attempt_at
    ) values (
      p_booking_id, v_otp, v_booking.customer_id,
      greatest(v_booking.scheduled_at + interval '4 hours', now() + interval '4 hours'),
      0, null, null
    )
    on conflict (booking_id) do update
    set code = excluded.code,
        customer_id = excluded.customer_id,
        expires_at = excluded.expires_at,
        attempt_count = 0,
        consumed_at = null,
        last_attempt_at = null;
  end if;

  insert into public.notifications (profile_id, type, payload)
  values
    (p_provider_id, 'booking.assigned', jsonb_build_object(
      'booking_id', p_booking_id,
      'strategy', p_strategy,
      'is_reassignment', v_previous_provider_id is not null
    )),
    (v_booking.customer_id, 'booking.provider_assigned', jsonb_build_object(
      'booking_id', p_booking_id,
      'provider_id', p_provider_id,
      'job_start_otp', v_otp,
      'is_reassignment', v_previous_provider_id is not null
    ));

  insert into public.notification_delivery_outbox (
    profile_id, channel, template_code, payload
  ) values
    (p_provider_id, 'email', 'booking_assigned_provider', jsonb_build_object(
      'booking_id', p_booking_id,
      'is_reassignment', v_previous_provider_id is not null
    )),
    (p_provider_id, 'sms', 'booking_assigned_provider', jsonb_build_object(
      'booking_id', p_booking_id,
      'is_reassignment', v_previous_provider_id is not null
    )),
    (v_booking.customer_id, 'email', 'booking_provider_assigned_customer', jsonb_build_object(
      'booking_id', p_booking_id,
      'provider_id', p_provider_id,
      'job_start_otp', v_otp,
      'is_reassignment', v_previous_provider_id is not null
    ));

  insert into public.booking_integration_outbox (
    booking_id, event_type, payload
  ) values (
    p_booking_id,
    'firebase.booking_status',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'customer_id', v_booking.customer_id,
      'provider_id', p_provider_id,
      'status', 'assigned',
      'actor_id', p_actor_user_id,
      'actor_role', 'admin',
      'source', 'admin'
    )
  )
  returning id into v_firebase_outbox_id;

  return jsonb_build_object(
    'booking_id', p_booking_id,
    'customer_id', v_booking.customer_id,
    'provider_id', p_provider_id,
    'previous_provider_id', v_previous_provider_id,
    'status', 'assigned',
    'action_type', v_action_type,
    'strategy', p_strategy,
    'otp_generated', v_otp is not null,
    'firebase_outbox_id', v_firebase_outbox_id
  );
end;
$$;

create or replace function public.record_booking_status_sync(
  p_outbox_id uuid,
  p_actor_user_id uuid,
  p_external_event_id text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_user(p_actor_user_id) then raise exception 'forbidden'; end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;

  update public.booking_integration_outbox
  set status = case when p_external_event_id is null then 'failed' else 'sent' end,
      attempts = attempts + 1,
      external_event_id = p_external_event_id,
      last_error = case when p_external_event_id is null
        then coalesce(p_error, 'firebase_status_sync_failed') else null end,
      synced_at = case when p_external_event_id is null then null else now() end
  where id = p_outbox_id
    and event_type = 'firebase.booking_status';
end;
$$;

create or replace function public.admin_set_provider_blocked(
  p_provider_id uuid,
  p_is_blocked boolean,
  p_reason text,
  p_actor_user_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous boolean;
  v_actor_role text;
begin
  if not (
    public.has_admin_role(p_actor_user_id, 'super_admin')
    or public.has_admin_role(p_actor_user_id, 'ops_admin')
  ) then raise exception 'forbidden'; end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;
  if p_is_blocked and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'block_reason_required';
  end if;

  select is_blocked into v_previous
  from public.profiles
  where id = p_provider_id and role = 'provider'
  for update;
  if not found then raise exception 'provider_not_found'; end if;

  if v_previous = p_is_blocked then return p_is_blocked; end if;

  update public.profiles set is_blocked = p_is_blocked where id = p_provider_id;
  select ar.code into v_actor_role
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_actor_user_id and ar.code in ('super_admin', 'ops_admin')
  order by case ar.code when 'super_admin' then 1 else 2 end
  limit 1;

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id,
    context, ip_address, user_agent
  ) values (
    p_actor_user_id, v_actor_role,
    case when p_is_blocked then 'BLOCK_PROVIDER' else 'UNBLOCK_PROVIDER' end,
    'provider', p_provider_id,
    jsonb_build_object(
      'previous_is_blocked', v_previous,
      'is_blocked', p_is_blocked,
      'reason', nullif(btrim(p_reason), '')
    ),
    p_ip_address, p_user_agent
  );
  return p_is_blocked;
end;
$$;

create or replace function public.admin_add_provider_note(
  p_provider_id uuid,
  p_note text,
  p_actor_user_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_actor_role text;
begin
  if not (
    public.has_admin_role(p_actor_user_id, 'super_admin')
    or public.has_admin_role(p_actor_user_id, 'ops_admin')
    or public.has_admin_role(p_actor_user_id, 'support_agent')
  ) then raise exception 'forbidden'; end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;
  if length(btrim(coalesce(p_note, ''))) not between 1 and 4000 then
    raise exception 'invalid_provider_note';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_provider_id and role = 'provider'
  ) then raise exception 'provider_not_found'; end if;

  insert into public.provider_admin_notes (provider_id, admin_user_id, note)
  values (p_provider_id, p_actor_user_id, btrim(p_note))
  returning id into v_id;

  select ar.code into v_actor_role
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_actor_user_id
    and ar.code in ('super_admin', 'ops_admin', 'support_agent')
  order by case ar.code
    when 'super_admin' then 1 when 'ops_admin' then 2 else 3 end
  limit 1;

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id,
    context, ip_address, user_agent
  ) values (
    p_actor_user_id, v_actor_role, 'ADD_PROVIDER_NOTE', 'provider', p_provider_id,
    jsonb_build_object('provider_note_id', v_id), p_ip_address, p_user_agent
  );
  return v_id;
end;
$$;

create or replace function public.admin_configure_provider(
  p_provider_id uuid,
  p_category_ids uuid[],
  p_service_areas jsonb,
  p_actor_user_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_ids uuid[];
  v_category_count integer;
  v_area_count integer;
  v_actor_role text;
begin
  if not (
    public.has_admin_role(p_actor_user_id, 'super_admin')
    or public.has_admin_role(p_actor_user_id, 'ops_admin')
  ) then raise exception 'forbidden'; end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_provider_id and role = 'provider'
  ) then raise exception 'provider_not_found'; end if;
  if jsonb_typeof(coalesce(p_service_areas, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_service_areas';
  end if;

  select coalesce(array_agg(distinct category_id order by category_id), array[]::uuid[])
  into v_category_ids
  from unnest(coalesce(p_category_ids, array[]::uuid[])) category_id;

  select count(*) into v_category_count
  from public.service_categories where id = any(v_category_ids);
  if v_category_count <> cardinality(v_category_ids) then
    raise exception 'invalid_service_category';
  end if;

  v_area_count := jsonb_array_length(coalesce(p_service_areas, '[]'::jsonb));
  if v_area_count > 100 then raise exception 'too_many_service_areas'; end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_service_areas, '[]'::jsonb)) area
    where jsonb_typeof(area) <> 'object'
      or length(upper(regexp_replace(coalesce(area->>'postcode_pattern', ''), '\s+', '', 'g'))) not between 2 and 8
      or (
        nullif(area->>'category_id', '') is not null
        and not ((area->>'category_id')::uuid = any(v_category_ids))
      )
  ) then raise exception 'invalid_service_area'; end if;

  perform pg_advisory_xact_lock(hashtextextended('provider-config:' || p_provider_id::text, 0));

  update public.provider_services
  set is_active = category_id = any(v_category_ids)
  where provider_id = p_provider_id;

  insert into public.provider_services (
    provider_id, category_id, title, price_pence, duration_mins, is_active
  )
  select p_provider_id, category.id, category.name,
    category.min_price_pence, 60, true
  from public.service_categories category
  where category.id = any(v_category_ids)
  on conflict (provider_id, category_id) do update set is_active = true;

  delete from public.provider_service_areas where provider_id = p_provider_id;
  insert into public.provider_service_areas (
    provider_id, category_id, postcode_pattern, created_by
  )
  select distinct
    p_provider_id,
    nullif(area->>'category_id', '')::uuid,
    upper(regexp_replace(area->>'postcode_pattern', '\s+', '', 'g')),
    p_actor_user_id
  from jsonb_array_elements(coalesce(p_service_areas, '[]'::jsonb)) area;

  select ar.code into v_actor_role
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_actor_user_id and ar.code in ('super_admin', 'ops_admin')
  order by case ar.code when 'super_admin' then 1 else 2 end
  limit 1;

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id,
    context, ip_address, user_agent
  ) values (
    p_actor_user_id, v_actor_role, 'CONFIGURE_PROVIDER_COVERAGE',
    'provider', p_provider_id,
    jsonb_build_object(
      'category_ids', to_jsonb(v_category_ids),
      'service_areas', coalesce(p_service_areas, '[]'::jsonb)
    ),
    p_ip_address, p_user_agent
  );

  return jsonb_build_object(
    'provider_id', p_provider_id,
    'category_ids', to_jsonb(v_category_ids),
    'service_area_count', v_area_count
  );
end;
$$;

create or replace function public.admin_set_provider_vetting(
  p_provider_id uuid,
  p_action text,
  p_reason text,
  p_actor_user_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status text;
  v_new_status text;
  v_actor_role text;
begin
  if not (
    public.has_admin_role(p_actor_user_id, 'super_admin')
    or public.has_admin_role(p_actor_user_id, 'ops_admin')
  ) then raise exception 'forbidden'; end if;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id then
    raise exception 'actor_mismatch';
  end if;
  if p_action not in ('approve', 'reject', 'request_documents') then
    raise exception 'invalid_vetting_action';
  end if;
  if p_action in ('reject', 'request_documents')
    and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'vetting_reason_required';
  end if;

  select kyc_status::text into v_previous_status
  from public.profiles
  where id = p_provider_id and role = 'provider'
  for update;
  if not found then raise exception 'provider_not_found'; end if;

  v_new_status := case when p_action = 'approve' then 'approved'
    when p_action = 'reject' then 'rejected' else 'pending' end;
  update public.profiles
  set kyc_status = v_new_status::public.kyc_status
  where id = p_provider_id;

  if p_action in ('reject', 'request_documents') then
    insert into public.provider_admin_notes (provider_id, admin_user_id, note)
    values (
      p_provider_id,
      p_actor_user_id,
      case when p_action = 'reject' then 'Vetting rejected: '
        else 'More documents requested: ' end || btrim(p_reason)
    );
  end if;

  select ar.code into v_actor_role
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_actor_user_id and ar.code in ('super_admin', 'ops_admin')
  order by case ar.code when 'super_admin' then 1 else 2 end
  limit 1;

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id,
    context, ip_address, user_agent
  ) values (
    p_actor_user_id, v_actor_role,
    case p_action
      when 'approve' then 'APPROVE_PROVIDER'
      when 'reject' then 'REJECT_PROVIDER'
      else 'REQUEST_PROVIDER_DOCUMENTS'
    end,
    'provider', p_provider_id,
    jsonb_build_object(
      'previous_vetting_status', v_previous_status,
      'vetting_status', v_new_status,
      'reason', nullif(btrim(p_reason), '')
    ),
    p_ip_address, p_user_agent
  );

  insert into public.notifications (profile_id, type, payload)
  values (
    p_provider_id,
    'provider.vetting_updated',
    jsonb_build_object('status', v_new_status, 'action', p_action)
  );
  insert into public.notification_delivery_outbox (
    profile_id, channel, template_code, payload
  ) values (
    p_provider_id,
    'email',
    'provider_vetting_updated',
    jsonb_build_object(
      'status', v_new_status,
      'action', p_action,
      'reason', nullif(btrim(p_reason), '')
    )
  );
  return v_new_status;
end;
$$;

