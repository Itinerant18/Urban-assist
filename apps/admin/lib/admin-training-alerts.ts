import type { AdminTrainingComplianceRow } from '@urban-assist/domain';

export type TrainingQualityAlertId =
  | 'high_risk_incomplete'
  | 'online_incomplete'
  | 'zero_progress'
  | `quiz_fail_rate:${string}`
  | 'offer_blocked';

export type TrainingQualityAlert = {
  id: TrainingQualityAlertId;
  severity: 'warning' | 'danger';
  title: string;
  detail: string;
  count: number;
  href: string;
};

/**
 * Ops alerts from compliance rows (not a full rules engine).
 * // ponytail: thresholds are fixed; tune when ops complain
 */
/** Quiz items failing more than half their recent attempts (min sample below). */
export const QUIZ_FAIL_RATE_THRESHOLD = 0.5;
export const QUIZ_FAIL_MIN_ATTEMPTS = 5;

export function buildTrainingQualityAlerts(input: {
  rows: AdminTrainingComplianceRow[];
  onlineProviderIds: ReadonlySet<string>;
  /** Recent quiz attempts aggregated per gating item. */
  quizStats?: Array<{ itemId: string; title: string; total: number; fails: number }>;
  /** offer.blocked_training analytics events in the window. */
  blockedOffers?: { events: number; providers: number };
}): TrainingQualityAlert[] {
  const alerts: TrainingQualityAlert[] = [];

  for (const stat of input.quizStats ?? []) {
    if (stat.total < QUIZ_FAIL_MIN_ATTEMPTS) continue;
    if (stat.fails / stat.total <= QUIZ_FAIL_RATE_THRESHOLD) continue;
    alerts.push({
      id: `quiz_fail_rate:${stat.itemId}`,
      severity: 'danger',
      title: `Quiz failing: ${stat.title}`,
      detail: `${stat.fails}/${stat.total} recent attempts failed — content or pass score may need review`,
      count: stat.fails,
      href: '/training',
    });
  }

  if (input.blockedOffers && input.blockedOffers.events > 0) {
    alerts.push({
      id: 'offer_blocked',
      severity: 'warning',
      title: 'Offers blocked by training',
      detail: `${input.blockedOffers.events} offer(s) skipped for ${input.blockedOffers.providers} provider(s) in the last 30 days`,
      count: input.blockedOffers.events,
      href: '/training?threshold=incomplete',
    });
  }

  const incomplete = input.rows.filter((row) => !row.isEligible);
  if (incomplete.length === 0) return alerts;

  const highRiskProviders = new Set(
    incomplete.filter((row) => row.isHighRisk).map((row) => row.providerId),
  );
  if (highRiskProviders.size > 0) {
    alerts.push({
      id: 'high_risk_incomplete',
      severity: 'danger',
      title: 'High-risk training missing',
      detail: `${highRiskProviders.size} provider(s) incomplete on gated categories`,
      count: highRiskProviders.size,
      href: '/training?threshold=high_risk_missing',
    });
  }

  const incompleteProviders = new Set(incomplete.map((row) => row.providerId));
  const onlineIncomplete = [...incompleteProviders].filter((id) =>
    input.onlineProviderIds.has(id),
  );
  if (onlineIncomplete.length > 0) {
    alerts.push({
      id: 'online_incomplete',
      severity: 'warning',
      title: 'Online with incomplete training',
      detail: `${onlineIncomplete.length} online provider(s) still missing gated modules`,
      count: onlineIncomplete.length,
      href: '/training?threshold=incomplete',
    });
  }

  const zeroProgressProviders = new Set(
    incomplete.filter((row) => row.completedModules === 0).map((row) => row.providerId),
  );
  if (zeroProgressProviders.size > 0) {
    alerts.push({
      id: 'zero_progress',
      severity: 'warning',
      title: 'No modules completed',
      detail: `${zeroProgressProviders.size} provider(s) at 0% on at least one gated offer`,
      count: zeroProgressProviders.size,
      href: '/training?threshold=incomplete',
    });
  }

  return alerts;
}
