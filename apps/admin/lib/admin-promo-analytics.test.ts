import { describe, expect, it } from 'vitest';
import {
  buildPromoCampaignStats,
  estimateDiscountPence,
  redemptionUtilization,
  summarizePromoCampaigns,
} from './admin-promo-analytics';

describe('estimateDiscountPence', () => {
  it('reconstructs percent discount from subtotal', () => {
    // 10% off £100 net → £90 subtotal → ~£10 discount
    expect(estimateDiscountPence(9000, { discount_type: 'percent', discount_value: 10 })).toBe(1000);
  });

  it('uses fixed discount value', () => {
    expect(estimateDiscountPence(5000, { discount_type: 'fixed', discount_value: 1000 })).toBe(1000);
  });
});

describe('buildPromoCampaignStats', () => {
  const promos = [
    { id: 'p1', discount_type: 'percent' as const, discount_value: 10 },
    { id: 'p2', discount_type: 'fixed' as const, discount_value: 500 },
  ];

  it('rolls up bookings and 14d window', () => {
    const end = new Date('2026-08-03T12:00:00Z');
    const stats = buildPromoCampaignStats(
      promos,
      [
        {
          promo_code_id: 'p1',
          status: 'completed',
          total_pence: 10800,
          price_pence: 9000,
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          promo_code_id: 'p1',
          status: 'cancelled',
          total_pence: 0,
          price_pence: 4500,
          created_at: '2026-07-01T10:00:00Z',
        },
        {
          promo_code_id: 'p2',
          status: 'completed',
          total_pence: 6000,
          price_pence: 5000,
          created_at: '2026-08-02T10:00:00Z',
        },
      ],
      14,
      end,
    );

    const p1 = stats.find((s) => s.promoId === 'p1')!;
    expect(p1.bookings).toBe(2);
    expect(p1.completed).toBe(1);
    expect(p1.cancelled).toBe(1);
    expect(p1.gmvPence).toBe(10800);
    expect(p1.last14dBookings).toBe(1);
    expect(p1.estimatedDiscountPence).toBeGreaterThan(0);

    const p2 = stats.find((s) => s.promoId === 'p2')!;
    expect(p2.bookings).toBe(1);
    expect(p2.estimatedDiscountPence).toBe(500);
  });
});

describe('summarizePromoCampaigns', () => {
  it('sums campaigns and counts active', () => {
    const totals = summarizePromoCampaigns(
      [
        {
          promoId: 'a',
          bookings: 2,
          completed: 1,
          cancelled: 1,
          gmvPence: 1000,
          estimatedDiscountPence: 100,
          last14dBookings: 1,
        },
      ],
      new Set(['a', 'b']),
    );
    expect(totals.promoBookings).toBe(2);
    expect(totals.activeCampaigns).toBe(2);
  });
});

describe('redemptionUtilization', () => {
  it('returns null when uncapped', () => {
    expect(redemptionUtilization(5, null)).toBeNull();
  });

  it('caps at 100', () => {
    expect(redemptionUtilization(12, 10)).toBe(100);
    expect(redemptionUtilization(5, 10)).toBe(50);
  });
});
