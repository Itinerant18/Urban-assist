-- 1. Add evidence_url column
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS evidence_url text;

-- 2. Ensure pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Create the webhook trigger function using pg_net
CREATE OR REPLACE FUNCTION public.trigger_support_webhook()
RETURNS trigger AS $$
DECLARE
  hook_url text;
BEGIN
  -- We'll assume the URL for the edge function is stored in Vault or passed as env
  -- If running locally, we can point to the local edge functions endpoint
  hook_url := current_setting('app.settings.edge_function_url', true);
  
  IF hook_url IS NULL OR hook_url = '' THEN
     hook_url := 'http://host.docker.internal:54321/functions/v1/support-ticket-webhook';
  ELSE
     hook_url := hook_url || '/support-ticket-webhook';
  END IF;

  PERFORM net.http_post(
      url := hook_url,
      body := jsonb_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA,
          'record', row_to_json(NEW)
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach the trigger to support_tickets
DROP TRIGGER IF EXISTS on_support_ticket_insert ON public.support_tickets;
CREATE TRIGGER on_support_ticket_insert
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_support_webhook();
