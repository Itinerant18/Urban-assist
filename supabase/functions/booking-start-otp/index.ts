// Booking start-code lifecycle. Clients authenticate with their Supabase access token.
// The provider verification path delegates to the atomic service-role RPC.

// @ts-expect-error Deno globals
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const accessToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!accessToken) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const bookingId = typeof body.booking_id === 'string' ? body.booking_id : '';
  const mode = body.mode === 'verify' ? 'verify' : body.mode === 'reveal' ? 'reveal' : null;
  if (!mode || !isUuid(bookingId)) return json({ error: 'invalid_request' }, 400);

  const { data: booking } = await service
    .from('bookings')
    .select('id, customer_id, provider_id, status')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return json({ error: 'booking_not_found' }, 404);

  if (mode === 'reveal') {
    if (booking.customer_id !== user.id) return json({ error: 'forbidden' }, 403);
    if (!['assigned', 'on_the_way', 'arrived'].includes(booking.status)) {
      return json({ error: 'invalid_status_transition' }, 400);
    }

    const { data: current, error } = await service
      .from('booking_start_codes')
      .select('code, expires_at, consumed_at')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (error) return json({ error: 'start_code_lookup_failed' }, 500);
    if (!current) return json({ error: 'start_code_not_found' }, 404);
    if (current.consumed_at) return json({ error: 'start_code_already_used' }, 409);

    let result = current;
    if (new Date(current.expires_at).getTime() <= Date.now()) {
      const code = generateCode();
      const { data: rotated, error: rotateError } = await service
        .from('booking_start_codes')
        .update({
          code,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          attempt_count: 0,
          last_attempt_at: null,
        })
        .eq('booking_id', bookingId)
        .is('consumed_at', null)
        .select('code, expires_at, consumed_at')
        .single();
      if (rotateError || !rotated) return json({ error: 'start_code_rotation_failed' }, 500);
      result = rotated;
    }
    return json({ code: result.code, expires_at: result.expires_at });
  }

  if (booking.provider_id !== user.id) return json({ error: 'forbidden' }, 403);
  const code = typeof body.code === 'string' ? body.code : '';
  if (!/^\d{4}$/.test(code)) return json({ error: 'invalid_request' }, 400);

  const { data: verification, error: verificationError } = await service.rpc(
    'verify_booking_start_code',
    { p_booking_id: bookingId, p_provider_id: user.id, p_code: code },
  );
  if (verificationError) return json({ error: 'start_code_verification_failed' }, 500);
  if (verification !== 'verified') return json({ error: verification }, 400);
  return json({ verified: true });
});

function generateCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 10000).padStart(4, '0');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
