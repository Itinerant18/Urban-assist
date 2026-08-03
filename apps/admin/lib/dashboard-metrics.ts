const LIQUIDITY_HOURS = [8, 10, 12, 14];

export function buildLiquidityData(
  bookings: Array<{ created_at: string }>,
  onlineProviders: number,
) {
  const bookingsByHour = new Map<number, number>();
  for (const booking of bookings) {
    const hour = new Date(booking.created_at).getHours();
    bookingsByHour.set(hour, (bookingsByHour.get(hour) ?? 0) + 1);
  }

  return LIQUIDITY_HOURS.map((hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    bookings: bookingsByHour.get(hour) ?? 0,
    providers: onlineProviders,
  }));
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : undefined;
  return Math.round(((current - previous) / previous) * 100);
}

const DEFAULT_STATUS_ORDER = [
  'pending_match',
  'unmatched',
  'assigned',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'disputed',
  'cancelled',
] as const;

export type BookingStatusCount = {
  status: string;
  label: string;
  count: number;
};

/** Compact status rollup for the ops home — always shows key live states. */
export function buildBookingStatusBreakdown(
  rows: Array<{ status: string }>,
  order: readonly string[] = DEFAULT_STATUS_ORDER,
): BookingStatusCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const alwaysShow = new Set(['pending_match', 'assigned', 'in_progress']);
  return order
    .filter((status) => alwaysShow.has(status) || (counts.get(status) ?? 0) > 0)
    .map((status) => ({
      status,
      label: status.replaceAll('_', ' '),
      count: counts.get(status) ?? 0,
    }));
}

export type NamedCount = {
  id: string | null;
  label: string;
  count: number;
  /** 0–1 share of total for bar width. */
  share: number;
};

/**
 * Top-N named buckets (category / city). Sorted by count desc.
 * // ponytail: in-memory rollup from today's booking rows; RPC later if volume hurts
 */
export function buildNamedCountBreakdown(
  labels: Array<string | null | undefined>,
  options: { limit?: number; emptyLabel?: string; ids?: Array<string | null | undefined> } = {},
): NamedCount[] {
  const limit = options.limit ?? 6;
  const emptyLabel = options.emptyLabel ?? 'Unknown';
  const counts = new Map<string, { id: string | null; label: string; count: number }>();

  labels.forEach((raw, index) => {
    const label = (raw ?? '').trim() || emptyLabel;
    const key = label.toLowerCase();
    const id = options.ids?.[index] ?? null;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { id: id ?? null, label, count: 1 });
  });

  const total = labels.length || 1;
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((row) => ({
      ...row,
      share: row.count / total,
    }));
}
