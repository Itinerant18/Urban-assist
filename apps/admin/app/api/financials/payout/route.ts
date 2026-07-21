import { NextResponse } from 'next/server';
import { z } from 'zod';
import { releaseProviderEarnings } from '@urban-assist/integrations/stripe';
import { requireAdminPermission } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const Schema = z
  .object({
    providerId: z.string().uuid().optional(),
    batch: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.providerId) !== Boolean(value.batch), {
    message: 'Provide exactly one of providerId or batch',
  });

export async function POST(req: Request) {
  try {
    const { db, user, roles } = await requireAdminPermission('can_manage_payments');
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.providerId) {
      const result = await releaseProviderEarnings(db, parsed.data.providerId);
      await (db as any).rpc('append_admin_action_log', {
        p_actor_user_id: user.id,
        p_actor_role_code: roles[0] ?? null,
        p_action_type: 'PAYOUT_TRIGGER',
        p_entity_type: 'provider',
        p_entity_id: parsed.data.providerId,
        p_context: result,
        p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        p_user_agent: req.headers.get('user-agent'),
      });
      return NextResponse.json({ success: true, ...result });
    }

    const { data: completed, error } = await db
      .from('bookings')
      .select('provider_id')
      .eq('status', 'completed')
      .not('provider_id', 'is', null);
    if (error) throw error;

    const providerIds = [...new Set((completed ?? []).map((booking) => booking.provider_id))].filter(
      (providerId): providerId is string => Boolean(providerId),
    );
    const processed = [];
    for (const providerId of providerIds) {
      const result = await releaseProviderEarnings(db, providerId);
      processed.push({ provider_id: providerId, ...result });
    }

    await (db as any).rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: roles[0] ?? null,
      p_action_type: 'PAYOUT_BATCH_TRIGGER',
      p_entity_type: 'payout',
      p_entity_id: user.id,
      p_context: { provider_count: providerIds.length, processed },
      p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      p_user_agent: req.headers.get('user-agent'),
    });
    return NextResponse.json({ success: true, processed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'internal_server_error';
    const status = message === 'unauthorized' ? 401 : message === 'forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
