import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';

const Schema = z.object({
  completed: z.boolean(),
  /** Optional score when a quiz is attached later. */
  score: z.number().min(0).max(100).optional(),
});

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
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createServiceRole();

  const { data: item } = await admin
    .from('training_items')
    .select('id, pass_score, gates_category, category_id')
    .eq('id', params.itemId)
    .eq('is_active', true)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

  if (parsed.data.completed) {
    // Quiz modules cannot be self-attested — must go through /quiz.
    if (item.pass_score != null) {
      const { count } = await admin
        .from('training_quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', params.itemId)
        .eq('is_active', true);
      if ((count ?? 0) > 0) {
        return NextResponse.json({ error: 'quiz_required' }, { status: 400 });
      }
      if (parsed.data.score == null) {
        return NextResponse.json({ error: 'score_required' }, { status: 400 });
      }
      if (parsed.data.score < item.pass_score) {
        return NextResponse.json({ error: 'score_below_pass' }, { status: 400 });
      }
    }

    const { error } = await admin.from('provider_training_completions').upsert(
      {
        provider_id: user.id,
        item_id: params.itemId,
        score: parsed.data.score ?? null,
        source: item.pass_score != null ? 'quiz' : 'self_attested',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_id,item_id' },
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

  // Refresh soft eligibility snapshot (no hard job gating yet).
  await admin.rpc('refresh_provider_training_eligibility', {
    p_provider_id: user.id,
  });

  return NextResponse.json({ ok: true, completed: parsed.data.completed });
}
