-- Hosted Supabase denies `alter database ... set app.settings.*` to the
-- postgres role (42501), so the GUC half of the 0022 pattern is unusable.
-- Read the base URL from Vault (name: edge_function_url) instead, with the
-- GUC kept as a fallback for local/self-hosted setups where it does work.
create or replace function public.invoke_scheduled_edge_function(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  edge_secret text;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'edge_function_url'
  limit 1;

  if base_url is null or base_url = '' then
    base_url := current_setting('app.settings.edge_function_url', true);
  end if;

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
