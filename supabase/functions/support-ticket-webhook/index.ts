import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0'

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  // Only the Postgres trigger (bearing the service-role key) may invoke this;
  // it holds the service role and reads user records. verify_jwt at the gateway
  // blocks unauthenticated callers; this blocks anon-JWT callers too.
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!SERVICE_ROLE_KEY || bearer !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    
    // The payload comes from the pg_net trigger, which passes the NEW record in payload.record
    const ticket = payload.record;
    
    // We can fetch the user email from the DB using a service role key.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    let email = 'Unknown User';
    if (ticket?.raised_by) {
      const { data: userData } = await supabaseClient.auth.admin.getUserById(ticket.raised_by);
      if (userData?.user?.email) {
        email = userData.user.email;
      }
    }

    const hook = Deno.env.get('SUPPORT_NOTIFICATION_WEBHOOK');
    if (hook) {
      const res = await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: ticket,
          user: email,
        }),
      });
      
      if (!res.ok) {
        console.error('Webhook failed', await res.text());
        return new Response(JSON.stringify({ error: 'Webhook delivery failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('Edge function error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
