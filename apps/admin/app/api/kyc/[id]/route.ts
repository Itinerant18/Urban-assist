import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { getProviderKyc } from '@urban-assist/domain';

import { requireAdminPermission } from '../../../../lib/admin-auth';
import { getRequestContext } from '../../../../lib/request-context';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseServer();
    const data = await getProviderKyc(db, params.id);
    
    // Generate signed URLs for private files in provider_documents bucket
    const documentsWithUrls = await Promise.all((data.documents || []).map(async (doc: any) => {
      const { data: signData } = await db.storage
        .from('provider_documents')
        .createSignedUrl(doc.storage_path, 3600);
      return {
        ...doc,
        signedUrl: signData?.signedUrl || null,
      };
    }));

    return NextResponse.json({
      profile: data.profile,
      documents: documentsWithUrls,
    });
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 404;
    return NextResponse.json({ error: e.message }, { status });
  }
}

const ActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_documents']),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = ActionSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { db, user } = await requireAdminPermission('can_manage_kyc');
    const requestContext = getRequestContext(req);
    const { data, error } = await (db as any).rpc('admin_set_provider_vetting', {
      p_provider_id: params.id,
      p_action: parsed.data.action,
      p_reason: parsed.data.reason ?? '',
      p_actor_user_id: user.id,
      p_ip_address: requestContext.ipAddress,
      p_user_agent: requestContext.userAgent,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, vettingStatus: data });
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
