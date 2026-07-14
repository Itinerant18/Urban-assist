import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { getProviderKyc, approveKyc, rejectKyc } from '@urban-assist/domain';

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
  action: z.enum(['approve', 'reject']),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseServer();
    const parsed = ActionSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.action === 'approve') {
      await approveKyc(db, createServiceRole(), params.id);
    } else {
      await rejectKyc(db, createServiceRole(), params.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'unauthorized' ? 401 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }
}
