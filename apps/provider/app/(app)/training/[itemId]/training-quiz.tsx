'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@urban-assist/ui';

type QuizQuestionPublic = {
  id: string;
  prompt: string;
  options: string[];
};

export function TrainingQuiz({
  itemId,
  passScore,
  initiallyPassed,
}: {
  itemId: string;
  passScore: number;
  initiallyPassed: boolean;
}) {
  const router = useRouter();
  const [questions, setQuestions] = React.useState<QuizQuestionPublic[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/training/${itemId}/quiz`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? 'Could not load quiz');
        if (!cancelled) setQuestions(body.questions ?? []);
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message ?? 'Could not load quiz');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  async function submit() {
    if (!questions) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/training/${itemId}/quiz`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedIndex: answers[q.id] ?? -1,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error === 'incomplete_answers'
            ? 'Answer every question before submitting.'
            : body.error ?? 'Submit failed',
        );
      }
      setResult({
        score: body.score,
        passed: body.passed,
        correct: body.correct,
        total: body.total,
      });
      if (body.passed) router.refresh();
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !questions) {
    return <p className="text-sm text-danger">{loadError}</p>;
  }

  if (!questions) {
    return <p className="text-sm text-muted">Loading quiz…</p>;
  }

  if (initiallyPassed && !result) {
    return (
      <Card className="!p-4 space-y-2">
        <p className="text-sm font-semibold text-ink">Quiz passed</p>
        <p className="text-xs text-muted">
          You have already met the {passScore}% pass mark for this module. Retake only if you want
          to refresh.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setResult(null);
            setIndex(0);
            setAnswers({});
          }}
        >
          Retake quiz
        </Button>
      </Card>
    );
  }

  if (result) {
    return (
      <Card className="!p-4 space-y-3">
        <p className={`text-sm font-semibold ${result.passed ? 'text-success' : 'text-danger'}`}>
          {result.passed ? 'Passed' : 'Not quite'} — {Math.round(result.score)}%
        </p>
        <p className="text-xs text-muted">
          {result.correct} of {result.total} correct. Pass mark is {passScore}%.
        </p>
        {!result.passed && (
          <Button
            type="button"
            className="w-full min-h-12"
            onClick={() => {
              setResult(null);
              setIndex(0);
              setAnswers({});
            }}
          >
            Retake quiz
          </Button>
        )}
        {result.passed && (
          <p className="text-xs text-muted">
            Category eligibility has been updated. You can accept jobs in this category when other
            requirements are met.
          </p>
        )}
      </Card>
    );
  }

  const q = questions[index]!;
  const progress = ((index + 1) / questions.length) * 100;
  const selected = answers[q.id];
  const allAnswered = questions.every((question) => answers[question.id] != null);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] uppercase tracking-wider text-muted font-mono">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>Pass {passScore}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Card className="!p-4 space-y-3">
        <p className="text-sm font-semibold text-ink leading-snug">{q.prompt}</p>
        <ul className="space-y-2">
          {q.options.map((opt, i) => {
            const active = selected === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
                  className={`tap w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    active
                      ? 'border-ink bg-ink text-bg'
                      : 'border-hairline bg-white text-ink hover:border-ink'
                  }`}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={index === 0 || busy}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Back
        </Button>
        {index < questions.length - 1 ? (
          <Button
            type="button"
            className="flex-1"
            disabled={selected == null || busy}
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 min-h-12"
            disabled={!allAnswered || busy}
            onClick={submit}
          >
            {busy ? 'Scoring…' : 'Submit quiz'}
          </Button>
        )}
      </div>
      {loadError && <p className="text-xs text-danger">{loadError}</p>}
    </div>
  );
}
