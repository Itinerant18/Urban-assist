import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { retryMatching } from '@urban-assist/domain';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    await retryMatching(getSupabaseServer(), createServiceRole(), {
      bookingId: params.id,
      userId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_retry' }, { status: 400 });
  }
}
