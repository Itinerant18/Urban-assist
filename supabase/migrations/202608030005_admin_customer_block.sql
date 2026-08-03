-- Shared customer suspend/restore RPC (mirrors admin_set_provider_blocked).
-- Roles: super_admin + support_agent (can_manage_users).

create or replace function public.admin_set_customer_blocked(
  p_customer_id uuid,
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
    or public.has_admin_role(p_actor_user_id, 'support_agent')
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
  where id = p_customer_id and role = 'customer'
  for update;
  if not found then raise exception 'customer_not_found'; end if;

  if v_previous = p_is_blocked then return p_is_blocked; end if;

  update public.profiles set is_blocked = p_is_blocked where id = p_customer_id;
  select ar.code into v_actor_role
  from public.admin_user_roles aur
  join public.admin_roles ar on ar.id = aur.role_id
  where aur.user_id = p_actor_user_id and ar.code in ('super_admin', 'support_agent')
  order by case ar.code when 'super_admin' then 1 else 2 end
  limit 1;

  insert into audit.admin_action_logs (
    actor_user_id, actor_role_code, action_type, entity_type, entity_id,
    context, ip_address, user_agent
  ) values (
    p_actor_user_id, v_actor_role,
    case when p_is_blocked then 'BLOCK_CUSTOMER' else 'UNBLOCK_CUSTOMER' end,
    'customer', p_customer_id,
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

revoke all on function public.admin_set_customer_blocked(
  uuid, boolean, text, uuid, inet, text
) from public;
grant execute on function public.admin_set_customer_blocked(
  uuid, boolean, text, uuid, inet, text
) to service_role;
