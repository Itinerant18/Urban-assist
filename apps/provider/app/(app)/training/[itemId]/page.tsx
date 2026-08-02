import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { Badge, Card } from '@urban-assist/ui';
import { ukDate } from '@urban-assist/lib';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { MarkCompleteButton } from './mark-complete-button';
import { TrainingQuiz } from './training-quiz';

export const dynamic = 'force-dynamic';

export default async function TrainingItemPage({ params }: { params: { itemId: string } }) {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: item }, { data: completion }, { data: mine }] = await Promise.all([
    db
      .from('training_items')
      .select(
        'id, category_id, title, description, content_url, kind, is_mandatory, estimated_mins, gates_category, pass_score, category:service_categories(name, slug)',
      )
      .eq('id', params.itemId)
      .eq('is_active', true)
      .maybeSingle(),
    db
      .from('provider_training_completions')
      .select('completed_at, score, source')
      .eq('provider_id', user.id)
      .eq('item_id', params.itemId)
      .maybeSingle(),
    db.from('provider_services').select('category_id').eq('provider_id', user.id),
  ]);

  if (!item) return notFound();

  const myCategories = new Set((mine ?? []).map((s: { category_id: string }) => s.category_id));
  if (item.category_id && !myCategories.has(item.category_id)) {
    return notFound();
  }

  const category = Array.isArray(item.category) ? item.category[0] : item.category;
  const quizRequired = item.pass_score != null;
  const quizPassed =
    quizRequired &&
    completion?.score != null &&
    completion.score >= item.pass_score!;
  const done = quizRequired ? quizPassed : Boolean(completion?.completed_at);

  let hasQuizQuestions = false;
  if (quizRequired) {
    try {
      const admin = createServiceRole();
      const { count } = await admin
        .from('training_quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', item.id)
        .eq('is_active', true);
      hasQuizQuestions = (count ?? 0) > 0;
    } catch {
      hasQuizQuestions = false;
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-2 pb-8">
      <Link href="/training" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
        <ArrowLeft className="h-4 w-4" /> Training
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {item.is_mandatory && <Badge tone="accent">Required</Badge>}
          {item.gates_category && <Badge tone="warning">Gates category</Badge>}
          {quizRequired && <Badge tone="muted">Quiz</Badge>}
          {category?.name && <Badge tone="muted">{category.name}</Badge>}
          {done && <Badge tone="success">Completed</Badge>}
        </div>
        <h1 className="font-display text-xl font-bold text-ink">{item.title}</h1>
        {item.description && <p className="text-sm text-muted leading-relaxed">{item.description}</p>}
      </header>

      <Card className="!p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted">Type</span>
          <span className="font-medium capitalize text-ink">{item.kind.replace('_', ' ')}</span>
        </div>
        {item.estimated_mins != null && (
          <div className="flex justify-between gap-3">
            <span className="text-muted">Est. time</span>
            <span className="font-medium text-ink">{item.estimated_mins} mins</span>
          </div>
        )}
        {item.pass_score != null && (
          <div className="flex justify-between gap-3">
            <span className="text-muted">Pass score</span>
            <span className="font-medium text-ink">{item.pass_score}%</span>
          </div>
        )}
        {done && completion?.completed_at && (
          <div className="flex justify-between gap-3">
            <span className="text-muted">Completed</span>
            <span className="font-medium text-ink">{ukDate(completion.completed_at)}</span>
          </div>
        )}
        {done && completion?.score != null && (
          <div className="flex justify-between gap-3">
            <span className="text-muted">Score</span>
            <span className="font-medium text-ink">{Math.round(Number(completion.score))}%</span>
          </div>
        )}
      </Card>

      {item.gates_category && (
        <p className="rounded-xl border border-hairline bg-bg/60 px-3 py-2 text-xs text-ink">
          You must pass this module before accepting{' '}
          <strong>{category?.name ?? 'this category'}</strong> jobs.
        </p>
      )}

      {item.content_url ? (
        <a
          href={item.content_url}
          target="_blank"
          rel="noreferrer noopener"
          className="tap flex min-h-12 items-center justify-center gap-2 rounded-xl border border-hairline bg-white text-sm font-semibold text-accent"
        >
          Open material <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}

      {hasQuizQuestions && item.pass_score != null ? (
        <TrainingQuiz
          itemId={item.id}
          passScore={item.pass_score}
          initiallyPassed={Boolean(quizPassed)}
        />
      ) : quizRequired ? (
        <p className="text-xs text-muted">
          Quiz questions are being prepared. Self-attestation is disabled for this module.
        </p>
      ) : (
        <MarkCompleteButton itemId={item.id} initiallyDone={done} />
      )}
    </div>
  );
}
