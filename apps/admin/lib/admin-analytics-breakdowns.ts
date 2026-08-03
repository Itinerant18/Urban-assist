export type BreakdownRow = {
  label: string;
  bookings: number;
  completedGmvPence: number;
  /** Share of total bookings, 0–1. */
  share: number;
};

/**
 * Rank bookings by a label (city, category name). Rows with no label group
 * under "Unknown". Top N; the rest collapse into "Other".
 * // ponytail: request-time rollup like the daily trend; RPC when volume hurts
 */
export function buildBookingBreakdown(
  rows: Array<{ label: string | null; status: string; total_pence: number | null }>,
  topN = 8,
): BreakdownRow[] {
  const byLabel = new Map<string, { bookings: number; completedGmvPence: number }>();
  for (const row of rows) {
    const label = row.label?.trim() || 'Unknown';
    const entry = byLabel.get(label) ?? { bookings: 0, completedGmvPence: 0 };
    entry.bookings += 1;
    if (row.status === 'completed') entry.completedGmvPence += row.total_pence ?? 0;
    byLabel.set(label, entry);
  }

  const total = rows.length;
  const ranked = [...byLabel.entries()]
    .map(([label, e]) => ({ label, ...e, share: total ? e.bookings / total : 0 }))
    .sort((a, b) => b.bookings - a.bookings || a.label.localeCompare(b.label));

  if (ranked.length <= topN) return ranked;
  const head = ranked.slice(0, topN);
  const rest = ranked.slice(topN);
  head.push({
    label: 'Other',
    bookings: rest.reduce((s, r) => s + r.bookings, 0),
    completedGmvPence: rest.reduce((s, r) => s + r.completedGmvPence, 0),
    share: rest.reduce((s, r) => s + r.share, 0),
  });
  return head;
}
