import { describe, expect, it } from 'vitest';
import {
  completionSatisfiesModule,
  isCategoryTrainingEligible,
  scoreQuizAttempt,
  trainingGateMessage,
} from './quiz';

describe('scoreQuizAttempt', () => {
  const questions = [
    { id: 'q1', correctIndex: 0 },
    { id: 'q2', correctIndex: 2 },
    { id: 'q3', correctIndex: 1 },
    { id: 'q4', correctIndex: 0 },
  ];

  it('scores percentage and pass against threshold', () => {
    const result = scoreQuizAttempt(
      questions,
      [
        { questionId: 'q1', selectedIndex: 0 },
        { questionId: 'q2', selectedIndex: 2 },
        { questionId: 'q3', selectedIndex: 0 },
        { questionId: 'q4', selectedIndex: 0 },
      ],
      80,
    );
    expect(result.correct).toBe(3);
    expect(result.score).toBe(75);
    expect(result.passed).toBe(false);
  });

  it('passes at exactly pass_score', () => {
    const result = scoreQuizAttempt(
      questions,
      [
        { questionId: 'q1', selectedIndex: 0 },
        { questionId: 'q2', selectedIndex: 2 },
        { questionId: 'q3', selectedIndex: 1 },
        { questionId: 'q4', selectedIndex: 1 },
      ],
      75,
    );
    expect(result.score).toBe(75);
    expect(result.passed).toBe(true);
  });
});

describe('completionSatisfiesModule / isCategoryTrainingEligible', () => {
  const items = [
    {
      id: 'gate',
      category_id: 'cat-ac',
      is_mandatory: true,
      gates_category: true,
      pass_score: 80,
    },
  ];

  it('rejects completion below pass_score', () => {
    expect(
      completionSatisfiesModule(items[0]!, {
        item_id: 'gate',
        score: 70,
      }),
    ).toBe(false);
    expect(
      isCategoryTrainingEligible('cat-ac', items, [{ item_id: 'gate', score: 70 }]),
    ).toBe(false);
  });

  it('accepts completion meeting pass_score', () => {
    expect(
      isCategoryTrainingEligible('cat-ac', items, [{ item_id: 'gate', score: 80 }]),
    ).toBe(true);
  });
});

describe('trainingGateMessage', () => {
  it('uses category-specific copy', () => {
    expect(trainingGateMessage('air-conditioning', 'AC')).toMatch(/AC training/i);
    expect(trainingGateMessage('electrical', 'Electrical')).toMatch(/electrical/i);
  });
});
