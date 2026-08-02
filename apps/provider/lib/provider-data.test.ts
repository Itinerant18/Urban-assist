import { describe, expect, it } from 'vitest';
import { splitCommission, computePerformance } from './provider-data';

describe('splitCommission', () => {
  // Mirrors claim_booking_payout() in SQL, which pays
  // price_pence - round(price_pence * commission_bps / 10000).
  // If these two ever disagree, the offer screen and the statement promise a provider
  // one number and the payout sends another.

  it('takes nothing at 0 bps, the current default rule', () => {
    expect(splitCommission(10_000, 0)).toEqual({ commission: 0, net: 10_000, bps: 0 });
  });

  it('takes 15% at 1500 bps', () => {
    expect(splitCommission(10_000, 1500)).toEqual({
      commission: 1_500,
      net: 8_500,
      bps: 1500,
    });
  });

  it('rounds to whole pence, matching SQL round()', () => {
    // 3333 * 1250 / 10000 = 416.625 -> 417
    expect(splitCommission(3_333, 1250).commission).toBe(417);
    expect(Number.isInteger(splitCommission(3_333, 1250).net)).toBe(true);
  });

  it('always keeps commission + net === gross', () => {
    for (const gross of [0, 1, 99, 1_234, 9_999, 250_000]) {
      for (const bps of [0, 1, 250, 1500, 3333, 10_000]) {
        const { commission, net } = splitCommission(gross, bps);
        expect(commission + net).toBe(gross);
        expect(net).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('leaves the provider nothing at 100% rather than going negative', () => {
    expect(splitCommission(5_000, 10_000)).toEqual({
      commission: 5_000,
      net: 0,
      bps: 10_000,
    });
  });
});

describe('computePerformance', () => {
  const profile = { rating_avg: 4.6, rating_count: 12, acceptance_rate: 0.8 };

  it('returns null rates rather than flattering defaults with no history', () => {
    const s = computePerformance(profile, []);
    // A provider with no jobs has no completion rate. 100% would be a claim the
    // data does not support.
    expect(s.completionRate).toBeNull();
    expect(s.cancellationRate).toBeNull();
    expect(s.onTimeRate).toBeNull();
    expect(s.totalCompleted).toBe(0);
    expect(s.repeatCustomers).toBe(0);
  });

  it('computes completion and cancellation from finished jobs only', () => {
    const s = computePerformance(profile, [
      { status: 'completed', customer_id: 'a' },
      { status: 'completed', customer_id: 'b' },
      { status: 'completed', customer_id: 'c' },
      { status: 'cancelled', customer_id: 'd' },
      // In-flight jobs are not yet an outcome and must not count either way.
      { status: 'in_progress', customer_id: 'e' },
      { status: 'assigned', customer_id: 'f' },
    ]);
    expect(s.completionRate).toBeCloseTo(3 / 4);
    expect(s.cancellationRate).toBeCloseTo(1 / 4);
    expect(s.totalCompleted).toBe(3);
  });

  it('ignores completed jobs with no recorded arrival when scoring punctuality', () => {
    const s = computePerformance(profile, [
      // Predates the arrived_at column: unknown, not late.
      { status: 'completed', customer_id: 'a', scheduled_at: '2026-07-01T10:00:00Z' },
      // On time.
      {
        status: 'completed',
        customer_id: 'b',
        scheduled_at: '2026-07-02T10:00:00Z',
        arrived_at: '2026-07-02T09:55:00Z',
      },
      // Late.
      {
        status: 'completed',
        customer_id: 'c',
        scheduled_at: '2026-07-03T10:00:00Z',
        arrived_at: '2026-07-03T10:20:00Z',
      },
    ]);
    expect(s.onTimeSample).toBe(2);
    expect(s.onTimeRate).toBeCloseTo(0.5);
  });

  it('counts arriving exactly on the scheduled minute as on time', () => {
    const s = computePerformance(profile, [
      {
        status: 'completed',
        customer_id: 'a',
        scheduled_at: '2026-07-02T10:00:00Z',
        arrived_at: '2026-07-02T10:00:00Z',
      },
    ]);
    expect(s.onTimeRate).toBe(1);
  });

  it('counts a repeat customer only once, however many times they rebook', () => {
    const s = computePerformance(profile, [
      { status: 'completed', customer_id: 'a' },
      { status: 'completed', customer_id: 'a' },
      { status: 'completed', customer_id: 'a' },
      { status: 'completed', customer_id: 'b' },
    ]);
    expect(s.repeatCustomers).toBe(1);
  });

  it('passes through rating and acceptance from the profile', () => {
    const s = computePerformance(profile, []);
    expect(s.ratingAvg).toBe(4.6);
    expect(s.ratingCount).toBe(12);
    expect(s.acceptanceRate).toBe(0.8);
  });

  it('survives a missing profile without inventing numbers', () => {
    const s = computePerformance(null, []);
    expect(s.ratingAvg).toBe(0);
    expect(s.ratingCount).toBe(0);
    expect(s.acceptanceRate).toBeNull();
  });
});
