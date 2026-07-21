-- The edge runtime no longer reliably matches the legacy service-role JWT, so
-- the support webhook now authenticates with the shared EDGE_FUNCTION_SECRET
-- (Vault: edge_function_secret), same scheme as the scheduled edge functions.
-- Falls back to the legacy edge_service_role_key secret if the new one is absent.
create or replace function public.trigger_support_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  bearer text;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'edge_function_url'
  limit 1;

  if base_url is null or base_url = '' then
    base_url := current_setting('app.settings.edge_function_url', true);
  end if;

  select decrypted_secret into bearer
  from vault.decrypted_secrets
  where name = 'edge_function_secret'
  limit 1;

  if bearer is null or bearer = '' then
    select decrypted_secret into bearer
    from vault.decrypted_secrets
    where name = 'edge_service_role_key'
    limit 1;
  end if;

  if base_url is null or base_url = '' or bearer is null or bearer = '' then
    return new;
  end if;

  perform net.http_post(
    url := base_url || '/support-ticket-webhook',
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', row_to_json(new)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || bearer
    )
  );

  return new;
end;
$$;
