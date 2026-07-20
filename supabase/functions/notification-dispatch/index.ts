// Dispatches durable notifications created in Postgres to registered FCM devices.
// Invoke from a trusted scheduler with x-edge-function-secret: EDGE_FUNCTION_SECRET.

// @ts-expect-error Deno globals
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EDGE_FUNCTION_SECRET = Deno.env.get('EDGE_FUNCTION_SECRET') ?? '';
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') ?? '';
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface PendingNotification {
  id: string;
  profile_id: string;
  type: string;
  payload: Record<string, unknown>;
  delivery_status: 'pending' | 'processing' | 'failed';
  delivery_attempts: number;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!isAuthorized(req)) return json({ error: 'unauthorized' }, 401);
  if (!FCM_SERVER_KEY) return json({ error: 'fcm_not_configured' }, 503);

  const staleClaim = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from('notifications')
    .select('id, profile_id, type, payload, delivery_status, delivery_attempts')
    .or(
      `delivery_status.in.(pending,failed),and(delivery_status.eq.processing,last_delivery_attempt_at.lt.${staleClaim})`,
    )
    .lt('delivery_attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return json({ error: 'notification_query_failed' }, 500);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const candidate of (data ?? []) as PendingNotification[]) {
    const claimed = await claim(candidate);
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const { data: tokenRows, error: tokenError } = await db
      .from('fcm_tokens')
      .select('token')
      .eq('profile_id', candidate.profile_id);

    if (tokenError) {
      await markFailed(candidate.id, tokenError.message);
      failed += 1;
      continue;
    }

    const tokens = (tokenRows ?? []).map((row: { token: string }) => row.token);
    if (tokens.length === 0) {
      await markSent(candidate.id, 'no_registered_device');
      skipped += 1;
      continue;
    }

    const outcomes = await Promise.all(
      tokens.map((token) => deliver(token, candidate.type, candidate.payload)),
    );
    const delivered = outcomes.filter((outcome) => outcome.ok).length;
    const invalidTokens = outcomes
      .filter((outcome) => outcome.invalidToken)
      .map((outcome) => outcome.token);

    if (invalidTokens.length > 0) {
      await db.from('fcm_tokens').delete().in('token', invalidTokens);
    }

    if (delivered > 0) {
      await markSent(candidate.id, delivered < outcomes.length ? 'partial_delivery' : null);
      sent += 1;
    } else {
      const reason = outcomes.map((outcome) => outcome.error).filter(Boolean).join('; ');
      await markFailed(candidate.id, reason || 'fcm_delivery_failed');
      failed += 1;
    }
  }

  return json({ processed: data?.length ?? 0, sent, failed, skipped });
});

async function claim(notification: PendingNotification): Promise<boolean> {
  const { data, error } = await db
    .from('notifications')
    .update({
      delivery_status: 'processing',
      delivery_attempts: notification.delivery_attempts + 1,
      last_delivery_attempt_at: new Date().toISOString(),
      delivery_error: null,
    })
    .eq('id', notification.id)
    .eq('delivery_status', notification.delivery_status)
    .eq('delivery_attempts', notification.delivery_attempts)
    .select('id')
    .maybeSingle();

  return !error && Boolean(data);
}

async function markSent(notificationId: string, note: string | null) {
  await db
    .from('notifications')
    .update({
      delivery_status: 'sent',
      delivered_at: new Date().toISOString(),
      delivery_error: note,
    })
    .eq('id', notificationId)
    .eq('delivery_status', 'processing');
}

async function markFailed(notificationId: string, reason: string) {
  await db
    .from('notifications')
    .update({
      delivery_status: 'failed',
      delivery_error: reason.slice(0, 500),
    })
    .eq('id', notificationId)
    .eq('delivery_status', 'processing');
}

async function deliver(
  token: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<{ token: string; ok: boolean; invalidToken: boolean; error?: string }> {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: { title: getTitle(type), body: getBody(type) },
        data: {
          type,
          payload: JSON.stringify(payload),
          ...(typeof payload.booking_id === 'string'
            ? { booking_id: payload.booking_id }
            : {}),
        },
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      failure?: number;
      results?: Array<{ error?: string }>;
    };
    const error = result.results?.[0]?.error;
    const ok = response.ok && result.failure !== 1 && !error;
    return {
      token,
      ok,
      invalidToken: error === 'NotRegistered' || error === 'InvalidRegistration',
      ...(error ? { error } : {}),
    };
  } catch (error) {
    return {
      token,
      ok: false,
      invalidToken: false,
      error: error instanceof Error ? error.message : 'fcm_request_failed',
    };
  }
}

function isAuthorized(req: Request): boolean {
  const secret = req.headers.get('x-edge-function-secret') ?? '';
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return Boolean(
    (EDGE_FUNCTION_SECRET && secret === EDGE_FUNCTION_SECRET) ||
      (SERVICE_ROLE_KEY && bearer === SERVICE_ROLE_KEY),
  );
}

function getTitle(type: string): string {
  const titles: Record<string, string> = {
    'offer.new': 'New job offer',
    'booking.assigned': 'Provider assigned',
    'booking.matched': 'Provider found',
    'booking.status_changed': 'Booking updated',
    'booking.completed': 'Job completed',
    'message.new': 'New message',
    'payment.released': 'Payment released',
  };
  return titles[type] ?? 'Urban Assist';
}

function getBody(type: string): string {
  const bodies: Record<string, string> = {
    'offer.new': 'A new service request is ready for your response.',
    'booking.assigned': 'A professional has been assigned to your booking.',
    'booking.matched': 'A professional has accepted your booking.',
    'booking.status_changed': 'The status of your booking has changed.',
    'booking.completed': 'Your booking is complete and ready for review.',
    'message.new': 'You have a new message about your booking.',
    'payment.released': 'Payment for a completed job has been sent to your account.',
  };
  return bodies[type] ?? 'You have a new notification.';
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
