import { describe, expect, it } from 'vitest';
import { buildDailyBookingTrend, trendTotals } from './admin-analytics-trends';

describe('buildDailyBookingTrend', () => {
  it('fills empty days and aggregates by UTC date', () => {
    const end = new Date('2026-08-03T15:00:00.000Z');
    const points = buildDailyBookingTrend(
      [
        { created_at: '2026-08-03T10:00:00.000Z', status: 'completed', total_pence: 5000 },
        { created_at: '2026-08-03T12:00:00.000Z', status: 'cancelled', total_pence: 2000 },
        { created_at: '2026-08-03T13:00:00.000Z', status: 'unmatched', total_pence: 1000 },
        { created_at: '2026-08-01T08:00:00.000Z', status: 'completed', total_pence: 3000 },
        { created_at: '2026-07-20T08:00:00.000Z', status: 'completed', total_pence: 9999 },
      ],
      3,
      end,
    );

    expect(points.map((p) => p.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    expect(points[0]).toMatchObject({ bookings: 1, completed: 1, gmvPence: 3000, cancelled: 0 });
    expect(points[1]).toMatchObject({ bookings: 0, completed: 0, gmvPence: 0 });
    expect(points[2]).toMatchObject({ bookings: 3, completed: 1, cancelled: 2, gmvPence: 5000 });
    expect(trendTotals(points)).toEqual({
      bookings: 4,
      completed: 2,
      cancelled: 2,
      gmvPence: 8000,
    });
  });
});
