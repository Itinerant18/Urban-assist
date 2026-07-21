-- Harden the support-ticket webhook trigger.
--
-- Before: it POSTed with only a Content-Type header (no auth) and, when the
-- edge_function_url setting was absent, fell back to
-- http://host.docker.internal:54321 — which does not resolve from hosted
-- Postgres, so the call fired into the void unauthenticated.
--
-- After: the destination URL comes from the `app.settings.edge_function_url`
-- database setting and the credential from a Vault secret named
-- `edge_service_role_key`. If either is missing we skip the POST entirely
-- (the ticket insert still succeeds) rather than send an unauthenticated or
-- misdirected request. The receiving function additionally verifies the bearer.
--
-- Operator setup (run once, outside migrations, when ready to enable):
--   alter database postgres
--     set app.settings.edge_function_url =
--       'https://xouanfmyieodnqmmkuxi.supabase.co/functions/v1';
--   select vault.create_secret(
--     '<SERVICE_ROLE_KEY>', 'edge_service_role_key',
--     'Bearer for support-ticket-webhook trigger');

create or replace function public.trigger_support_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text := current_setting('app.settings.edge_function_url', true);
  service_key text;
begin
  select decrypted_secret into service_key
    from vault.decrypted_secrets
    where name = 'edge_service_role_key'
    limit 1;

  -- No destination or no credential → do not fire. Ticket insert still commits.
  if base_url is null or base_url = '' or service_key is null then
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
