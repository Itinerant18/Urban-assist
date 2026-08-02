import { describe, expect, it } from 'vitest';
import {
  buildOfferedCategoryTrainingRow,
  filterAdminTrainingRows,
  isCategoryTrainingEligible,
  summarizeTraining,
} from './training-summary';

const items = [
  { id: 'a', category_id: null, is_mandatory: true, gates_category: false },
  { id: 'b', category_id: 'cat-elec', is_mandatory: true, gates_category: true },
  { id: 'c', category_id: 'cat-elec', is_mandatory: false, gates_category: false },
];

describe('summarizeTraining', () => {
  it('computes rates and gated incomplete count', () => {
    const summary = summarizeTraining(
      items,
      [{ item_id: 'a' }],
      [
        { category_id: 'cat-elec', required_modules: 1, completed_modules: 0, is_eligible: false },
      ],
    );
    expect(summary.total).toBe(3);
    expect(summary.completed).toBe(1);
    expect(summary.mandatoryTotal).toBe(2);
    expect(summary.mandatoryCompleted).toBe(1);
    expect(summary.completionRate).toBeCloseTo(1 / 3);
    expect(summary.mandatoryCompletionRate).toBe(0.5);
    expect(summary.gatedCategoriesIncomplete).toBe(1);
  });

  it('scopes gated incomplete to offered categories when provided', () => {
    const eligibility = [
      { category_id: 'cat-elec', required_modules: 1, completed_modules: 0, is_eligible: false },
      { category_id: 'cat-ac', required_modules: 1, completed_modules: 0, is_eligible: false },
    ];
    expect(
      summarizeTraining(items, [{ item_id: 'a' }], eligibility, new Set(['cat-clean']))
        .gatedCategoriesIncomplete,
    ).toBe(0);
    expect(
      summarizeTraining(items, [{ item_id: 'a' }], eligibility, ['cat-elec'])
        .gatedCategoriesIncomplete,
    ).toBe(1);
  });

  it('returns null rates when empty', () => {
    const summary = summarizeTraining([], []);
    expect(summary.completionRate).toBeNull();
    expect(summary.mandatoryCompletionRate).toBeNull();
  });
});

describe('isCategoryTrainingEligible', () => {
  it('is true when no gating modules', () => {
    expect(isCategoryTrainingEligible('other', items, [])).toBe(true);
  });

  it('requires all gating modules complete', () => {
    expect(isCategoryTrainingEligible('cat-elec', items, [])).toBe(false);
    expect(isCategoryTrainingEligible('cat-elec', items, [{ item_id: 'b' }])).toBe(true);
  });

  it('requires pass_score when configured on gating modules', () => {
    const withPass = [
      ...items.filter((i) => i.id !== 'b'),
      { id: 'b', category_id: 'cat-elec', is_mandatory: true, gates_category: true, pass_score: 80 },
    ];
    expect(
      isCategoryTrainingEligible('cat-elec', withPass, [{ item_id: 'b', score: 70 }]),
    ).toBe(false);
    expect(
      isCategoryTrainingEligible('cat-elec', withPass, [{ item_id: 'b', score: 85 }]),
    ).toBe(true);
  });
});

describe('buildOfferedCategoryTrainingRow', () => {
  it('computes completion from offered gating modules only', () => {
    const row = buildOfferedCategoryTrainingRow({
      providerId: 'p1',
      providerName: 'Alex',
      categoryId: 'cat-elec',
      categoryName: 'Electrical',
      categorySlug: 'electrical',
      gatingItems: [
        { id: 'b', pass_score: null },
        { id: 'd', pass_score: 80 },
      ],
      completions: [
        { item_id: 'b' },
        { item_id: 'd', score: 70 },
      ],
      updatedAt: '2026-08-01T00:00:00Z',
    });
    expect(row).toMatchObject({
      requiredModules: 2,
      completedModules: 1,
      completionRate: 0.5,
      isEligible: false,
      isHighRisk: true,
    });
  });

  it('returns null when category has no gating modules', () => {
    expect(
      buildOfferedCategoryTrainingRow({
        providerId: 'p1',
        providerName: 'Alex',
        categoryId: 'cat-clean',
        categoryName: 'Cleaning',
        categorySlug: 'cleaning',
        gatingItems: [],
        completions: [],
      }),
    ).toBeNull();
  });
});

describe('filterAdminTrainingRows', () => {
  const rows = [
    {
      providerId: 'p1',
      providerName: 'Alex',
      categoryId: 'cat-elec',
      categoryName: 'Electrical',
      categorySlug: 'electrical',
      requiredModules: 1,
      completedModules: 0,
      completionRate: 0,
      isEligible: false,
      isHighRisk: true,
      updatedAt: null,
    },
    {
      providerId: 'p2',
      providerName: 'Sam',
      categoryId: 'cat-ac',
      categoryName: 'Air conditioning',
      categorySlug: 'air-conditioning',
      requiredModules: 1,
      completedModules: 1,
      completionRate: 1,
      isEligible: true,
      isHighRisk: true,
      updatedAt: null,
    },
  ];

  it('filters by category, eligibility, and incomplete threshold', () => {
    expect(filterAdminTrainingRows(rows, { categoryId: 'cat-ac' })).toHaveLength(1);
    expect(filterAdminTrainingRows(rows, { eligibility: 'not_eligible' })).toHaveLength(1);
    expect(filterAdminTrainingRows(rows, { threshold: 'incomplete' })).toHaveLength(1);
    expect(filterAdminTrainingRows(rows, { threshold: 'high_risk_missing' })).toHaveLength(1);
  });
});
