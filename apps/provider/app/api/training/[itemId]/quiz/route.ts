import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { scoreQuizAttempt, track } from '@urban-assist/domain';

const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(5),
});

const SubmitSchema = z.object({
  answers: z.array(AnswerSchema).min(1).max(40),
});

/** Public quiz payload — never includes correct_index. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { itemId: string } },
) {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createServiceRole();
  const { data: item } = await admin
    .from('training_items')
    .select('id, title, pass_score, kind, gates_category, category_id, is_active')
    .eq('id', params.itemId)
    .eq('is_active', true)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
  if (item.pass_score == null) {
    return NextResponse.json({ error: 'quiz_not_configured' }, { status: 400 });
  }

  const { data: questions } = await admin
    .from('training_quiz_questions')
    .select('id, prompt, options, sort_order')
    .eq('item_id', params.itemId)
    .eq('is_active', true)
    .order('sort_order');

  if (!questions?.length) {
    return NextResponse.json({ error: 'quiz_empty' }, { status: 404 });
  }

  return NextResponse.json({
    itemId: item.id,
    title: item.title,
    passScore: item.pass_score,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options as string[],
    })),
  });
}

/** Score answers server-side; upsert completion only on pass. */
export async function POST(
  req: NextRequest,
  { params }: { params: { itemId: string } },
) {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = SubmitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createServiceRole();
  const { data: item } = await admin
    .from('training_items')
    .select('id, pass_score, category_id, title')
    .eq('id', params.itemId)
    .eq('is_active', true)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
  if (item.pass_score == null) {
    return NextResponse.json({ error: 'quiz_not_configured' }, { status: 400 });
  }

  const { data: questions } = await admin
    .from('training_quiz_questions')
    .select('id, correct_index')
    .eq('item_id', params.itemId)
    .eq('is_active', true);

  if (!questions?.length) {
    return NextResponse.json({ error: 'quiz_empty' }, { status: 404 });
  }

  const questionIds = new Set(questions.map((q) => q.id));
  for (const a of parsed.data.answers) {
    if (!questionIds.has(a.questionId)) {
      return NextResponse.json({ error: 'invalid_question' }, { status: 400 });
    }
  }
  // Require an answer for every active question.
  if (parsed.data.answers.length !== questions.length) {
    return NextResponse.json({ error: 'incomplete_answers' }, { status: 400 });
  }

  const result = scoreQuizAttempt(
    questions.map((q) => ({ id: q.id, correctIndex: q.correct_index })),
    parsed.data.answers.map((a) => ({
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
    })),
    item.pass_score,
  );

  await admin.from('provider_training_quiz_attempts').insert({
    provider_id: user.id,
    item_id: params.itemId,
    score: result.score,
    passed: result.passed,
    answers: parsed.data.answers,
  });

  if (result.passed) {
    const { error } = await admin.from('provider_training_completions').upsert(
      {
        provider_id: user.id,
        item_id: params.itemId,
        score: result.score,
        source: 'quiz',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_id,item_id' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.rpc('refresh_provider_training_eligibility', {
      p_provider_id: user.id,
    });
  }

  track(admin, user.id, {
    type: result.passed ? 'training.quiz_passed' : 'training.quiz_failed',
    payload: {
      item_id: params.itemId,
      score: result.score,
      pass_score: item.pass_score,
      category_id: item.category_id,
    },
  });

  return NextResponse.json({
    ok: true,
    ...result,
    passScore: item.pass_score,
  });
}
