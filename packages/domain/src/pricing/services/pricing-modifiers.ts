/**
 * Region / time-of-day / category percent adjustments on platform SKU price.
 * Stacked: matching rules' percents are summed, then capped, then applied.
 */

export type PricingModifierRule = {
  id?: string;
  label?: string;
  postcode_prefix: string | null;
  start_hour: number | null;
  end_hour: number | null;
  category_id: string | null;
  adjustment_percent: number;
  is_active: boolean;
};

export type PricingModifierContext = {
  /** Address postcode (any casing / spacing). */
  postcode: string | null;
  /** Hour 0–23 in Europe/London for the scheduled slot. */
  hour: number;
  categoryId: string | null;
};

export function normalizePostcodePrefix(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/\s+/g, '');
}

/** Hour of `iso` in Europe/London (0–23). */
export function hourInLondon(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const raw = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const hour = Number(raw);
  if (!Number.isFinite(hour)) return 0;
  // Some engines emit 24 for midnight.
  return hour === 24 ? 0 : hour;
}

export function pricingModifierMatches(
  rule: PricingModifierRule,
  ctx: PricingModifierContext,
): boolean {
  if (!rule.is_active) return false;

  if (rule.category_id && rule.category_id !== ctx.categoryId) return false;

  if (rule.postcode_prefix) {
    const prefix = normalizePostcodePrefix(rule.postcode_prefix);
    const postcode = normalizePostcodePrefix(ctx.postcode);
    if (!prefix || !postcode.startsWith(prefix)) return false;
  }

  if (rule.start_hour != null && rule.end_hour != null) {
    const start = rule.start_hour;
    const end = rule.end_hour;
    const h = ctx.hour;
    if (start === end) {
      // Degenerate window = no hours match.
      return false;
    }
    if (start < end) {
      if (h < start || h >= end) return false;
    } else if (h < start && h >= end) {
      // Overnight: matches [start,24) U [0,end)
      return false;
    }
  }

  return true;
}

/** Cap stacked percent before apply (same bounds as DB check, plus stack safety). */
export function clampAdjustmentPercent(total: number): number {
  if (!Number.isFinite(total)) return 0;
  return Math.max(-50, Math.min(100, total));
}

/**
 * Apply matching modifiers to a base price in pence.
 * Returns base unchanged when nothing matches.
 */
export function applyPricingModifiers(
  basePence: number,
  rules: PricingModifierRule[],
  ctx: PricingModifierContext,
): number {
  const base = Math.max(0, Math.round(basePence));
  const matching = rules.filter((rule) => pricingModifierMatches(rule, ctx));
  if (matching.length === 0) return base;

  const totalPct = matching.reduce((sum, rule) => sum + Number(rule.adjustment_percent), 0);
  const capped = clampAdjustmentPercent(totalPct);
  return Math.max(0, Math.round(base * (1 + capped / 100)));
}
