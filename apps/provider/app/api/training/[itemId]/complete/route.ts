import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

const Schema = z.object({ completed: z.boolean() });

/**
 * Mark a training item done or undone for the signed-in provider.
 *
 * Service-role write: provider_training_completions grants clients SELECT only
 * (202608020004), so a provider cannot forge a completion row for someone else — or,
 * once completions gate anything, for themselves outside this route. provider_id is
 * always taken from the session, never the request body.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { itemId: string } },
) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createServiceRole();

  // Reject unknown or retired items rather than storing a dangling completion.
  const { data: item } = await admin
    .from('training_items')
    .select('id')
    .eq('id', params.itemId)
    .eq('is_active', true)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

  if (parsed.data.completed) {
    const { error } = await admin
      .from('provider_training_completions')
      .upsert(
        { provider_id: user.id, item_id: params.itemId },
        { onConflict: 'provider_id,item_id', ignoreDuplicates: true },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await admin
      .from('provider_training_completions')
      .delete()
      .eq('provider_id', user.id)
      .eq('item_id', params.itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, completed: parsed.data.completed });
}
