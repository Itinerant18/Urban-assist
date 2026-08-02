-- Schedule durable notification delivery and stale-offer cascading.
-- The base URL is configured through app.settings.edge_function_url and the
-- shared EDGE_FUNCTION_SECRET value is stored in Vault as edge_function_secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_scheduled_edge_function(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text := current_setting('app.settings.edge_function_url', true);
  edge_secret text;
begin
  select decrypted_secret into edge_secret
  from vault.decrypted_secrets
  where name = 'edge_function_secret'
  limit 1;

  if base_url is null or base_url = '' or edge_secret is null or edge_secret = '' then
    return;
  end if;

  perform net.http_post(
    url := base_url || p_path,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || edge_secret
    )
  );
end;
$$;

revoke all on function public.invoke_scheduled_edge_function(text)
  from public, anon, authenticated;

select cron.schedule(
  'notification-dispatch-every-minute',
  '* * * * *',
  $$select public.invoke_scheduled_edge_function('/notification-dispatch');$$
);

select cron.schedule(
  'match-cascade-tick-every-minute',
  '* * * * *',
  $$select public.invoke_scheduled_edge_function('/match-cascade?mode=tick');$$
);
