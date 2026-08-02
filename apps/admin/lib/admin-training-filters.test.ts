import { describe, expect, it } from 'vitest';
import { readTrainingFilters } from './admin-training-filters';

describe('readTrainingFilters', () => {
  it('parses category, eligibility, threshold, and search', () => {
    expect(
      readTrainingFilters({
        category: 'cat-1',
        eligibility: 'not_eligible',
        threshold: 'incomplete',
        q: '  Alex  ',
      }),
    ).toEqual({
      categoryId: 'cat-1',
      eligibility: 'not_eligible',
      threshold: 'incomplete',
      q: 'Alex',
    });
  });

  it('ignores invalid enum values', () => {
    expect(
      readTrainingFilters({
        eligibility: 'maybe',
        threshold: 'all',
      }),
    ).toEqual({
      categoryId: null,
      eligibility: null,
      threshold: null,
      q: null,
    });
  });
});
