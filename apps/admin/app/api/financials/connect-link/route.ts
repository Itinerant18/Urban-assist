import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPayoutOnboardingLink } from '@urban-assist/integrations/stripe';
import { requireAdminPermission } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  providerId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const { db, user, roles } = await requireAdminPermission('can_manage_payments');
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const providerAppUrl = (
      process.env.NEXT_PUBLIC_PROVIDER_APP_URL ?? 'http://localhost:3001'
    ).replace(/\/$/, '');
    const returnUrl = `${providerAppUrl}/earnings`;

    const result = await createPayoutOnboardingLink(db, parsed.data.providerId, returnUrl);

    await (db as any).rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: roles[0] ?? null,
      p_action_type: 'CONNECT_ONBOARD_LINK',
      p_entity_type: 'provider',
      p_entity_id: parsed.data.providerId,
      p_context: { expires_at: result.expires_at },
      p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      p_user_agent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'internal_server_error';
    const status =
      message === 'unauthorized' || message === 'mfa_required'
        ? 401
        : message === 'forbidden'
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
