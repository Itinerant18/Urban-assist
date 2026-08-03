export type PromoRuleLike = {
  id: string;
  discount_type: 'percent' | 'fixed' | string;
  discount_value: number;
};

export type PromoBookingLike = {
  promo_code_id: string | null;
  status: string;
  total_pence: number | null;
  price_pence: number | null;
  created_at: string;
};

export type PromoCampaignStats = {
  promoId: string;
  bookings: number;
  completed: number;
  cancelled: number;
  /** Completed booking totals (customer paid). */
  gmvPence: number;
  /** Best-effort discount from stored subtotal + promo rule. */
  estimatedDiscountPence: number;
  last14dBookings: number;
};

export type PromoCampaignTotals = {
  promoBookings: number;
  completed: number;
  cancelled: number;
  gmvPence: number;
  estimatedDiscountPence: number;
  last14dBookings: number;
  activeCampaigns: number;
};

/**
 * Reverse discount from post-promo subtotal (`price_pence`) + rule.
 * Fixed uses the rule value (clamped to subtotal+value); percent reconstructs net.
 */
export function estimateDiscountPence(
  pricePence: number,
  promo: Pick<PromoRuleLike, 'discount_type' | 'discount_value'>,
): number {
  if (!Number.isFinite(pricePence) || pricePence < 0) return 0;
  if (promo.discount_type === 'fixed') {
    return Math.max(0, Math.min(promo.discount_value, pricePence + promo.discount_value));
  }
  const pct = promo.discount_value;
  if (!(pct > 0) || pct >= 100) return 0;
  const net = Math.round(pricePence / (1 - pct / 100));
  return Math.max(0, net - pricePence);
}

function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Per-code campaign rollup from booking rows that carry promo_code_id. */
export function buildPromoCampaignStats(
  promos: PromoRuleLike[],
  bookings: PromoBookingLike[],
  days = 14,
  end: Date = new Date(),
): PromoCampaignStats[] {
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const start = new Date(endDay);
  start.setUTCDate(endDay.getUTCDate() - (days - 1));
  const startIso = ymdUtc(start);

  const byId = new Map<string, PromoCampaignStats>();
  for (const promo of promos) {
    byId.set(promo.id, {
      promoId: promo.id,
      bookings: 0,
      completed: 0,
      cancelled: 0,
      gmvPence: 0,
      estimatedDiscountPence: 0,
      last14dBookings: 0,
    });
  }

  const promoById = new Map(promos.map((p) => [p.id, p]));

  for (const row of bookings) {
    if (!row.promo_code_id) continue;
    const bucket = byId.get(row.promo_code_id);
    const rule = promoById.get(row.promo_code_id);
    if (!bucket || !rule) continue;

    bucket.bookings += 1;
    if (row.created_at.slice(0, 10) >= startIso) {
      bucket.last14dBookings += 1;
    }
    if (row.status === 'completed') {
      bucket.completed += 1;
      bucket.gmvPence += row.total_pence ?? 0;
    }
    if (row.status === 'cancelled' || row.status === 'no_show') {
      bucket.cancelled += 1;
    }
    bucket.estimatedDiscountPence += estimateDiscountPence(row.price_pence ?? 0, rule);
  }

  return Array.from(byId.values()).sort(
    (a, b) => b.bookings - a.bookings || b.gmvPence - a.gmvPence,
  );
}

export function summarizePromoCampaigns(
  stats: PromoCampaignStats[],
  activePromoIds: Set<string>,
): PromoCampaignTotals {
  const totals = stats.reduce<PromoCampaignTotals>(
    (acc, s) => {
      acc.promoBookings += s.bookings;
      acc.completed += s.completed;
      acc.cancelled += s.cancelled;
      acc.gmvPence += s.gmvPence;
      acc.estimatedDiscountPence += s.estimatedDiscountPence;
      acc.last14dBookings += s.last14dBookings;
      return acc;
    },
    {
      promoBookings: 0,
      completed: 0,
      cancelled: 0,
      gmvPence: 0,
      estimatedDiscountPence: 0,
      last14dBookings: 0,
      activeCampaigns: 0,
    },
  );
  totals.activeCampaigns = activePromoIds.size;
  return totals;
}

/** Cap utilization 0–100; null when unlimited. */
export function redemptionUtilization(
  redemptionCount: number,
  maxRedemptions: number | null,
): number | null {
  if (maxRedemptions == null || maxRedemptions <= 0) return null;
  return Math.min(100, Math.round((redemptionCount / maxRedemptions) * 100));
}
