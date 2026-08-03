export type DailyTrendPoint = {
  /** YYYY-MM-DD */
  date: string;
  label: string;
  bookings: number;
  completed: number;
  cancelled: number;
  gmvPence: number;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const [, m, day] = iso.split('-');
  return `${day}/${m}`;
}

/**
 * Last N calendar days (UTC) of booking volume / completed GMV.
 * // ponytail: client-side rollup from booking rows; daily RPC if analytics traffic grows
 */
export function buildDailyBookingTrend(
  rows: Array<{ created_at: string; status: string; total_pence: number | null }>,
  days = 14,
  end: Date = new Date(),
): DailyTrendPoint[] {
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const buckets = new Map<string, DailyTrendPoint>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(endDay);
    d.setUTCDate(endDay.getUTCDate() - i);
    const date = ymd(d);
    buckets.set(date, {
      date,
      label: dayLabel(date),
      bookings: 0,
      completed: 0,
      cancelled: 0,
      gmvPence: 0,
    });
  }

  const startIso = [...buckets.keys()][0];
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    if (!startIso || date < startIso) continue;
    const bucket = buckets.get(date);
    if (!bucket) continue;
    bucket.bookings += 1;
    if (row.status === 'completed') {
      bucket.completed += 1;
      bucket.gmvPence += row.total_pence ?? 0;
    }
    // Matches get_admin_analytics: unmatched is a failed booking, no_show is
    // not a status in the enum (the old branch was dead code).
    if (row.status === 'cancelled' || row.status === 'unmatched') {
      bucket.cancelled += 1;
    }
  }

  return Array.from(buckets.values());
}

export function trendTotals(points: DailyTrendPoint[]) {
  return points.reduce(
    (acc, p) => {
      acc.bookings += p.bookings;
      acc.completed += p.completed;
      acc.cancelled += p.cancelled;
      acc.gmvPence += p.gmvPence;
      return acc;
    },
    { bookings: 0, completed: 0, cancelled: 0, gmvPence: 0 },
  );
}
