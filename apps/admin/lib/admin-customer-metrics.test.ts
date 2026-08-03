import { describe, expect, it } from 'vitest';
import {
  computeCustomerValueMetrics,
  isHighCancelRisk,
} from './admin-customer-metrics';

describe('computeCustomerValueMetrics', () => {
  it('sums completed LTV and avg order', () => {
    const metrics = computeCustomerValueMetrics(
      [
        { status: 'completed', total_pence: 5000 },
        { status: 'completed', total_pence: 3000 },
        { status: 'cancelled', total_pence: 2000 },
        { status: 'pending_match', total_pence: 1000 },
      ],
      [
        { status: 'succeeded', amount_pence: 5000 },
        { status: 'failed', amount_pence: 3000 },
      ],
    );
    expect(metrics).toEqual({
      bookingCount: 4,
      completedCount: 2,
      cancelledCount: 1,
      ltvPence: 8000,
      avgOrderPence: 4000,
      paidPence: 5000,
    });
  });

  it('handles empty history', () => {
    expect(computeCustomerValueMetrics([])).toEqual({
      bookingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      ltvPence: 0,
      avgOrderPence: 0,
      paidPence: 0,
    });
  });
});

describe('isHighCancelRisk', () => {
  it('flags high cancel rate only with enough volume', () => {
    expect(
      isHighCancelRisk({
        bookingCount: 2,
        completedCount: 0,
        cancelledCount: 2,
        ltvPence: 0,
        avgOrderPence: 0,
        paidPence: 0,
      }),
    ).toBe(false);
    expect(
      isHighCancelRisk({
        bookingCount: 5,
        completedCount: 1,
        cancelledCount: 3,
        ltvPence: 1000,
        avgOrderPence: 1000,
        paidPence: 1000,
      }),
    ).toBe(true);
  });
});
