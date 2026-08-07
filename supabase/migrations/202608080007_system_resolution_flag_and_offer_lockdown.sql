-- Review findings on PR #7. The rate-neutral sentinel introduced by 202608080006 was
-- forgeable, and it turned out the whole table was client-writable.
--
-- 1. FORGEABLE SENTINEL. 202608080006 promoted two values of booking_offers.decline_reason
--    ('schedule_conflict', 'taken_by_other') into a privileged marker that removes an offer
--    from the acceptance_rate ratio. But decline_reason is free-form client input: the
--    provider API validates it as z.string().max(200) and writes it verbatim. So a provider
--    could decline every job they did not fancy with
--        PATCH /api/offers/<id> {"accept": false, "decline_reason": "schedule_conflict"}
--    and every decline became rate-neutral, converging their acceptance_rate on 1.0 while
--    honest providers sat lower. acceptance_rate is 20% of the matching score, so the
--    forger outranks them indefinitely.
--
--    Fixed by moving the marker to its own column that no client input ever reaches.
--    decline_reason stays purely descriptive.
--
-- 2. THE TABLE WAS DIRECTLY WRITABLE. "offers provider respond" (0002_rls.sql:102) is
--    `for update using (provider_id = auth.uid())` with no WITH CHECK, no column scope and
--    no status predicate, and unlike profiles (202608020001), messages (0018),
--    notifications (0019) and reviews (0020), booking_offers never had its baseline grants
--    revoked. Verified: has_column_privilege('authenticated', 'booking_offers', 'status',
--    'UPDATE') is true. A provider could therefore bypass the API entirely --
--        PATCH /rest/v1/booking_offers?id=eq.<own offer> {"status":"accepted"}
--    -- and walk backwards through 30 days of their own declined/expired offers flipping
--    them to accepted, pinning acceptance_rate at 1.0. That is also why fixing (1) in the
--    API layer alone would not have held.
--
--    Every legitimate writer already uses the service-role client (the provider offer
--    routes construct it explicitly; cancel/reschedule/retry go through the domain layer
--    with `admin`), so revoking client writes breaks nothing.

-- ---------------------------------------------------------------------------
-- 1. A marker clients cannot write
-- ---------------------------------------------------------------------------

alter table public.booking_offers
  add column if not exists resolved_by_system boolean not null default false;

comment on column public.booking_offers.resolved_by_system is
  'True when the platform resolved this offer rather than the provider choosing: the overlap guard rejected their accept, another provider won the race, or an admin reassigned the booking. Excluded from acceptance_rate. Never written from client input - decline_reason is free-form and forgeable.';

-- Carry over the rows 202608080006 was relying on the forgeable text for. Scoped to
-- offers whose reason our own code wrote, which is all of them at this point: the
-- vulnerable release was live only briefly and the values are not otherwise in use.
update public.booking_offers
set resolved_by_system = true
where resolved_by_system = false
  and decline_reason in ('schedule_conflict', 'taken_by_other');

-- ---------------------------------------------------------------------------
-- 2. Lock the table down to the service role
-- ---------------------------------------------------------------------------

-- Mirrors 202608020001's treatment of profiles. Providers and customers keep SELECT (the
-- offer UI reads through RLS); all mutation goes through the API's service-role client.
revoke insert, update, delete on public.booking_offers from anon, authenticated;

-- The permissive UPDATE policy is now unreachable without the table grant, but drop it so
-- a future `grant` cannot silently re-open unrestricted writes.
drop policy if exists "offers provider respond" on public.booking_offers;

-- ---------------------------------------------------------------------------
-- 3. Ratio reads the new marker
-- ---------------------------------------------------------------------------

-- 202608080006's header claimed 'cascade_expired' was also treated as a system outcome.
-- It never was, and nothing ever wrote that value. The real set is now whatever sets
-- resolved_by_system, which is this migration's admin_assign_booking plus the two
-- matching-engine paths.
drop function if exists public.is_system_decline_reason(text);

create or replace function public.recompute_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare a numeric;
begin
  if new.status in ('accepted', 'declined', 'expired') then
    select coalesce(
             sum(case when o.status = 'accepted' then 1 else 0 end)::numeric
             / nullif(count(*), 0), 1.0)
      into a
      from public.booking_offers o
     where o.provider_id = new.provider_id
       and o.offered_at > now() - interval '30 days'
       and not o.resolved_by_system;
    update public.profiles set acceptance_rate = coalesce(a, 1.0) where id = new.provider_id;
  end if;
  return new;
end;
$$;

drop trigger if exists offers_recompute_acceptance on public.booking_offers;
create trigger offers_recompute_acceptance
after update on public.booking_offers
for each row execute function public.recompute_acceptance();

-- Recompute once so forged sentinels stop counting immediately.
update public.profiles p
set acceptance_rate = coalesce((
  select coalesce(
           sum(case when o.status = 'accepted' then 1 else 0 end)::numeric
           / nullif(count(*), 0), 1.0)
  from public.booking_offers o
  where o.provider_id = p.id
    and o.offered_at > now() - interval '30 days'
    and not o.resolved_by_system
), 1.0)
where p.role = 'provider';

-- ---------------------------------------------------------------------------
-- 4. Admin reassignment also stops penalising the displaced provider
-- ---------------------------------------------------------------------------
-- When ops manually assigns a booking elsewhere, the pending offer became a plain
-- 'expired' and counted in the displaced provider's denominator as a non-response. Same
-- class as the two matching-engine cases.
--
-- Body below is pg_get_functiondef() of the LIVE function, with exactly one line changed
-- (resolved_by_system = true added to the booking_offers UPDATE). Taken from the running
-- database rather than transcribed from a migration because this function has multiple
-- definitions in history and rebuilding from the wrong one silently drops behaviour.
CREATE OR REPLACE FUNCTION public.admin_assign_booking(p_booking_id uuid, p_provider_id uuid, p_actor_user_id uuid, p_strategy text DEFAULT 'manual_admin'::text, p_reason text DEFAULT NULL::text, p_generate_otp boolean DEFAULT true, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  set status = 'expired', responded_at = now(), resolved_by_system = true
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
$function$

;

revoke all on function public.admin_assign_booking(uuid, uuid, uuid, text, text, boolean, inet, text) from public, anon, authenticated;
grant execute on function public.admin_assign_booking(uuid, uuid, uuid, text, text, boolean, inet, text) to service_role;
