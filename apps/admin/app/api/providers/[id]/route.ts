import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminProviderDetail } from '../../../../lib/admin-providers';
import { requireAdminPermission, requireAdminRole } from '../../../../lib/admin-auth';
import { getRequestContext } from '../../../../lib/request-context';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await getAdminProviderDetail(params.id);
    return NextResponse.json(data);
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 404;
    return NextResponse.json({ error: e.message }, { status });
  }
}

const MutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('block'), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('unblock'), reason: z.string().trim().max(500).optional().default('') }),
  z.object({ action: z.literal('note'), note: z.string().trim().min(1).max(4000) }),
  z.object({
    action: z.literal('configure'),
    categoryIds: z.array(z.string().uuid()).max(50),
    serviceAreas: z.array(z.object({
      categoryId: z.string().uuid().nullable(),
      postcodePattern: z.string().trim().min(2).max(8),
    })).max(100),
  }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = MutationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    const authorization = body.action === 'note'
      ? await requireAdminRole(['super_admin', 'ops_admin', 'support_agent'])
      : await requireAdminPermission('can_manage_providers');
    const context = getRequestContext(req);
    const db = authorization.db as any;

    if (body.action === 'block' || body.action === 'unblock') {
      const { data, error } = await db.rpc('admin_set_provider_blocked', {
        p_provider_id: params.id,
        p_is_blocked: body.action === 'block',
        p_reason: body.reason,
        p_actor_user_id: authorization.user.id,
        p_ip_address: context.ipAddress,
        p_user_agent: context.userAgent,
      });
      if (error) throw error;
      return NextResponse.json({ isBlocked: data });
    }

    if (body.action === 'note') {
      const { data, error } = await db.rpc('admin_add_provider_note', {
        p_provider_id: params.id,
        p_note: body.note,
        p_actor_user_id: authorization.user.id,
        p_ip_address: context.ipAddress,
        p_user_agent: context.userAgent,
      });
      if (error) throw error;
      return NextResponse.json({ noteId: data });
    }

    const { data, error } = await db.rpc('admin_configure_provider', {
      p_provider_id: params.id,
      p_category_ids: body.categoryIds,
      p_service_areas: body.serviceAreas.map((area) => ({
        category_id: area.categoryId,
        postcode_pattern: area.postcodePattern,
      })),
      p_actor_user_id: authorization.user.id,
      p_ip_address: context.ipAddress,
      p_user_agent: context.userAgent,
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'provider_update_failed';
    const status = message === 'forbidden' ? 403 : message === 'unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
