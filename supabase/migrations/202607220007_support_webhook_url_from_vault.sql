-- Hosted Supabase cannot set app.settings.edge_function_url. Prefer the same
-- Vault secret used by scheduled edge functions, retaining the GUC fallback
-- for local and self-hosted environments.
create or replace function public.trigger_support_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'edge_function_url'
  limit 1;

  if base_url is null or base_url = '' then
    base_url := current_setting('app.settings.edge_function_url', true);
  end if;

  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'edge_service_role_key'
  limit 1;

  if base_url is null or base_url = '' or service_key is null or service_key = '' then
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
      'Authorization', 'Bearer ' || service_key
    )
  );

  return new;
end;
$$;
