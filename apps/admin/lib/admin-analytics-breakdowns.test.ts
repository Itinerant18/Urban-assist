import { describe, expect, it } from 'vitest';
import { buildBookingBreakdown } from './admin-analytics-breakdowns';

describe('buildBookingBreakdown', () => {
  it('ranks by bookings, sums completed GMV only, groups missing labels', () => {
    const rows = buildBookingBreakdown([
      { label: 'London', status: 'completed', total_pence: 5000 },
      { label: 'London', status: 'cancelled', total_pence: 2000 },
      { label: 'Leeds', status: 'completed', total_pence: 3000 },
      { label: null, status: 'assigned', total_pence: 1000 },
    ]);

    expect(rows.map((r) => r.label)).toEqual(['London', 'Leeds', 'Unknown']);
    expect(rows[0]).toMatchObject({ bookings: 2, completedGmvPence: 5000, share: 0.5 });
    expect(rows[2]).toMatchObject({ bookings: 1, completedGmvPence: 0 });
  });

  it('collapses the tail into Other beyond topN', () => {
    const rows = buildBookingBreakdown(
      ['a', 'b', 'c', 'd'].map((label) => ({ label, status: 'completed', total_pence: 100 })),
      2,
    );
    expect(rows.map((r) => r.label)).toEqual(['a', 'b', 'Other']);
    expect(rows[2]).toMatchObject({ bookings: 2, completedGmvPence: 200, share: 0.5 });
  });
});
