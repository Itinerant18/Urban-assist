import { describe, expect, it } from 'vitest';
import type { AdminTrainingComplianceRow } from '@urban-assist/domain';
import { buildTrainingQualityAlerts } from './admin-training-alerts';

function row(
  partial: Partial<AdminTrainingComplianceRow> & Pick<AdminTrainingComplianceRow, 'providerId'>,
): AdminTrainingComplianceRow {
  return {
    providerName: 'Test',
    categoryId: 'cat-1',
    categoryName: 'Electrical',
    categorySlug: 'electrical',
    requiredModules: 2,
    completedModules: 0,
    completionRate: 0,
    isEligible: false,
    isHighRisk: true,
    updatedAt: null,
    ...partial,
  };
}

describe('buildTrainingQualityAlerts', () => {
  it('returns empty when all eligible', () => {
    expect(
      buildTrainingQualityAlerts({
        rows: [row({ providerId: 'p1', isEligible: true, completedModules: 2, completionRate: 1 })],
        onlineProviderIds: new Set(['p1']),
      }),
    ).toEqual([]);
  });

  it('surfaces high-risk, online-incomplete, and zero-progress', () => {
    const alerts = buildTrainingQualityAlerts({
      rows: [
        row({ providerId: 'p1', completedModules: 0 }),
        row({ providerId: 'p2', completedModules: 1, completionRate: 0.5 }),
      ],
      onlineProviderIds: new Set(['p1']),
    });

    expect(alerts.map((a) => a.id)).toEqual([
      'high_risk_incomplete',
      'online_incomplete',
      'zero_progress',
    ]);
    expect(alerts[0]?.count).toBe(2);
    expect(alerts[1]?.count).toBe(1);
    expect(alerts[2]?.count).toBe(1);
  });

  it('flags failing quizzes and offer-time blocks even with zero incomplete rows', () => {
    const alerts = buildTrainingQualityAlerts({
      rows: [row({ providerId: 'p1', isEligible: true, completedModules: 2, completionRate: 1 })],
      onlineProviderIds: new Set(),
      quizStats: [
        { itemId: 'q1', title: 'Gas safety', total: 10, fails: 6 }, // 60% fail -> alert
        { itemId: 'q2', title: 'Ladders', total: 10, fails: 4 }, // 40% -> no alert
        { itemId: 'q3', title: 'New quiz', total: 3, fails: 3 }, // under min sample -> no alert
      ],
      blockedOffers: { events: 7, providers: 2 },
    });

    expect(alerts.map((a) => a.id)).toEqual(['quiz_fail_rate:q1', 'offer_blocked']);
    expect(alerts[0]?.count).toBe(6);
    expect(alerts[1]?.count).toBe(7);
  });
});
