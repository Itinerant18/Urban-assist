-- Log preferred_provider honor/override on admin assign.
CREATE OR REPLACE FUNCTION public.admin_assign_booking(p_booking_id uuid, p_provider_id uuid, p_actor_user_id uuid, p_strategy text DEFAULT 'manual_admin'::text, p_reason text DEFAULT NULL::text, p_generate_otp boolean DEFAULT true, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
declare
  v_booking public.bookings%rowtype;
  v_previous_provider_id uuid;
  v_action_type text;
  v_actor_role text;
  v_otp text;
  v_requires_otp boolean;
  v_candidate record;
  v_firebase_outbox_id uuid;
  v_preference_outcome text;
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

  -- Soft preference: override needs a short reason for the audit trail.
  v_preference_outcome := case
    when v_booking.preferred_provider_id is null then 'none'
    when v_booking.preferred_provider_id = p_provider_id then 'honored'
    else 'overridden'
  end;
  if v_preference_outcome = 'overridden'
    and length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'preference_override_reason_required';
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
    jsonb_build_object(
      'scheduled_at', v_booking.scheduled_at,
      'preferred_provider_id', v_booking.preferred_provider_id,
      'preference_outcome', v_preference_outcome
    )
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
      'provider_id', p_provider_id,
      'preferred_provider_id', v_booking.preferred_provider_id,
      'preference_outcome', v_preference_outcome
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
    'preferred_provider_id', v_booking.preferred_provider_id,
    'preference_outcome', v_preference_outcome,
    'status', 'assigned',
    'action_type', v_action_type,
    'strategy', p_strategy,
    'otp_generated', v_otp is not null,
    'firebase_outbox_id', v_firebase_outbox_id
  );
end;
$$;

