import { describe, expect, it } from 'vitest';
import { haversineKm } from '@urban-assist/utils';
import { score, bookingLocalSlot } from './services/matching-engine';

describe('haversineKm', () => {
  it('measures a known distance', () => {
    // London -> Manchester, ~262km great-circle.
    const km = haversineKm(51.5074, -0.1278, 53.4808, -2.2426);
    expect(km).toBeGreaterThan(258);
    expect(km).toBeLessThan(266);
  });

  it('is zero for the same point', () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it('is symmetric', () => {
    const a = haversineKm(51.5074, -0.1278, 53.4808, -2.2426);
    const b = haversineKm(53.4808, -2.2426, 51.5074, -0.1278);
    expect(a).toBeCloseTo(b, 9);
  });

  it('handles crossing the prime meridian', () => {
    // Greenwich to a point 1 degree east, at that latitude ~69km.
    const km = haversineKm(51.4779, -0.5, 51.4779, 0.5);
    expect(km).toBeGreaterThan(65);
    expect(km).toBeLessThan(72);
  });
});

describe('score', () => {
  const base = { provider_id: 'p', distance_km: 0, rating: 0, acceptance_rate: 0 };

  it('gives a perfect provider a score of 1', () => {
    expect(score({ ...base, distance_km: 0, rating: 5, acceptance_rate: 1 })).toBeCloseTo(1);
  });

  it('gives a worst-case provider a score of 0', () => {
    expect(score({ ...base, distance_km: 100, rating: 0, acceptance_rate: 0 })).toBe(0);
  });

  it('weights distance 50%, rating 30%, acceptance 20%', () => {
    // Distance alone, at 0km, contributes its full 0.5.
    expect(score({ ...base, distance_km: 0 })).toBeCloseTo(0.5);
    // Rating alone, at 5/5, contributes its full 0.3. Distance 15km contributes 0.
    expect(score({ ...base, distance_km: 15, rating: 5 })).toBeCloseTo(0.3);
    // Acceptance alone, at 1.0, contributes its full 0.2.
    expect(score({ ...base, distance_km: 15, acceptance_rate: 1 })).toBeCloseTo(0.2);
  });

  it('stops penalising distance beyond 15km rather than going negative', () => {
    const at15 = score({ ...base, distance_km: 15, rating: 5, acceptance_rate: 1 });
    const at50 = score({ ...base, distance_km: 50, rating: 5, acceptance_rate: 1 });
    const at500 = score({ ...base, distance_km: 500, rating: 5, acceptance_rate: 1 });
    expect(at15).toBeCloseTo(at50);
    expect(at50).toBeCloseTo(at500);
    expect(at500).toBeGreaterThan(0);
  });

  it('ranks a nearer provider above a further one when all else is equal', () => {
    const near = score({ ...base, distance_km: 2, rating: 4, acceptance_rate: 0.9 });
    const far = score({ ...base, distance_km: 12, rating: 4, acceptance_rate: 0.9 });
    expect(near).toBeGreaterThan(far);
  });

  it('lets a much closer provider outrank a better-rated distant one', () => {
    // 1km away, 3 stars beats 14km away, 5 stars — proximity is the heaviest term.
    const close = score({ ...base, distance_km: 1, rating: 3, acceptance_rate: 1 });
    const distant = score({ ...base, distance_km: 14, rating: 5, acceptance_rate: 1 });
    expect(close).toBeGreaterThan(distant);
  });
});

describe('bookingLocalSlot', () => {
  it('converts a summer UTC instant to BST local time', () => {
    // 2026-07-15 is BST (UTC+1).
    expect(bookingLocalSlot('2026-07-15T13:30:00Z')).toEqual({
      dateStr: '2026-07-15',
      timeStr: '14:30:00',
      weekday: 3, // Wednesday
    });
  });

  it('leaves a winter UTC instant unchanged under GMT', () => {
    expect(bookingLocalSlot('2026-01-14T13:30:00Z')).toEqual({
      dateStr: '2026-01-14',
      timeStr: '13:30:00',
      weekday: 3, // Wednesday
    });
  });

  it('rolls to the next London day when BST pushes past midnight', () => {
    // 23:30Z on Sunday is 00:30 Monday in London. A naive getDay() on the UTC
    // instant would say Sunday and match the wrong availability_slots row.
    expect(bookingLocalSlot('2026-07-19T23:30:00Z')).toEqual({
      dateStr: '2026-07-20',
      timeStr: '00:30:00',
      weekday: 1, // Monday
    });
  });

  it('produces times that compare correctly against slot bounds as strings', () => {
    const { timeStr } = bookingLocalSlot('2026-07-15T13:30:00Z'); // 14:30:00
    expect('09:00:00' <= timeStr && timeStr <= '17:00:00').toBe(true);
    expect('09:00:00' <= timeStr && timeStr <= '12:00:00').toBe(false);
    // Zero-padded so lexicographic order matches chronological order.
    const early = bookingLocalSlot('2026-01-15T09:05:00Z').timeStr;
    expect(early).toBe('09:05:00');
    expect(early < '10:00:00').toBe(true);
  });

  it('covers every weekday index it can emit', () => {
    // A full week in January (GMT, no offset surprises). 2026-01-11 is a Sunday.
    const days = ['11', '12', '13', '14', '15', '16', '17'].map(
      (d) => bookingLocalSlot(`2026-01-${d}T12:00:00Z`).weekday,
    );
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
