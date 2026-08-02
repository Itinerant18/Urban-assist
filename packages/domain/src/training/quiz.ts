import type {
  TrainingCompletionLike,
  TrainingItemLike,
} from './training-summary';

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type QuizAnswer = {
  questionId: string;
  selectedIndex: number;
};

export type QuizScoreResult = {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
};

/** Score a quiz attempt as a percentage (0–100), rounded to 2 decimals. */
export function scoreQuizAttempt(
  questions: Pick<QuizQuestion, 'id' | 'correctIndex'>[],
  answers: QuizAnswer[],
  passScore: number,
): QuizScoreResult {
  const byId = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));
  let correct = 0;
  for (const q of questions) {
    if (byId.get(q.id) === q.correctIndex) correct += 1;
  }
  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 10000) / 100;
  return {
    score,
    correct,
    total,
    passed: score >= passScore,
  };
}

export type GatingItemLike = TrainingItemLike & {
  pass_score?: number | null;
};

/** Whether a completion row satisfies a module (including pass_score when set). */
export function completionSatisfiesModule(
  item: GatingItemLike,
  completion: TrainingCompletionLike | undefined,
): boolean {
  if (!completion || completion.item_id !== item.id) return false;
  if (item.pass_score == null) return true;
  return completion.score != null && completion.score >= item.pass_score;
}

/**
 * Soft + hard eligibility: all gates_category modules for that category must be
 * completed, and quiz modules must meet pass_score.
 */
export function isCategoryTrainingEligible(
  categoryId: string,
  items: GatingItemLike[],
  completions: TrainingCompletionLike[],
): boolean {
  const gated = items.filter(
    (i) => i.category_id === categoryId && Boolean(i.gates_category),
  );
  if (gated.length === 0) return true;
  const byItem = new Map(completions.map((c) => [c.item_id, c]));
  return gated.every((i) => completionSatisfiesModule(i, byItem.get(i.id)));
}

/** Provider-facing copy when accept/assign is blocked. */
export function trainingGateMessage(
  categorySlug: string | null | undefined,
  categoryName: string | null | undefined,
): string {
  const slug = (categorySlug ?? '').toLowerCase();
  if (slug === 'air-conditioning' || slug === 'ac') {
    return 'Complete AC training to accept AC jobs.';
  }
  if (slug === 'electrical') {
    return 'Complete electrical safety training to take electrical work.';
  }
  const name = categoryName?.trim() || 'this category';
  return `Complete required training to accept ${name} jobs.`;
}
