import { describe, expect, it } from 'vitest';
import {
  bucketBookingsByHour,
  buildHourlyCapacity,
  capacityTone,
  formatHourLabel,
  readSchedulingFilters,
  schedulingGridHours,
  slotCoversHour,
  todayYmd,
  weekdayFromYmd,
} from './admin-scheduling';

describe('readSchedulingFilters', () => {
  it('defaults to today and ignores bad dates', () => {
    const now = new Date('2026-08-03T12:00:00.000Z');
    expect(readSchedulingFilters({}, now)).toEqual({
      date: '2026-08-03',
      categoryId: null,
    });
    expect(readSchedulingFilters({ date: 'nope', category: 'cat-1' }, now)).toEqual({
      date: '2026-08-03',
      categoryId: 'cat-1',
    });
  });

  it('accepts valid date', () => {
    expect(readSchedulingFilters({ date: '2026-08-10' })).toEqual({
      date: '2026-08-10',
      categoryId: null,
    });
  });
});

describe('bucketBookingsByHour', () => {
  it('groups and sorts within London-clock hour (BST: UTC+1)', () => {
    const buckets = bucketBookingsByHour([
      { id: 'b', scheduled_at: '2026-08-03T10:45:00.000Z' },
      { id: 'a', scheduled_at: '2026-08-03T10:15:00.000Z' },
      { id: 'c', scheduled_at: '2026-08-03T14:00:00.000Z' },
    ]);
    // Availability slots are local clock; 10:15Z in August is 11:15 in London.
    expect([...buckets.get(11)!.map((b) => b.id)]).toEqual(['a', 'b']);
    expect(buckets.get(15)).toHaveLength(1);
    expect(buckets.get(10)).toBeUndefined();
  });

  it('matches UTC in winter (GMT)', () => {
    const buckets = bucketBookingsByHour([
      { id: 'x', scheduled_at: '2026-01-05T10:15:00.000Z' },
    ]);
    expect(buckets.get(10)).toHaveLength(1);
  });
});

describe('schedulingGridHours / formatHourLabel', () => {
  it('builds hour range', () => {
    expect(schedulingGridHours(8, 11)).toEqual([8, 9, 10]);
    expect(formatHourLabel(9)).toBe('09:00');
  });

  it('todayYmd uses ISO date', () => {
    expect(todayYmd(new Date('2026-01-02T23:30:00.000Z'))).toBe('2026-01-02');
  });
});

describe('capacity helpers', () => {
  it('weekdayFromYmd is Sunday=0', () => {
    // 2026-08-03 is a Monday
    expect(weekdayFromYmd('2026-08-03')).toBe(1);
  });

  it('slotCoversHour respects weekday and window', () => {
    const slot = {
      provider_id: 'p1',
      weekday: 1,
      start_time: '09:00:00',
      end_time: '17:00:00',
    };
    expect(slotCoversHour(slot, 1, 9)).toBe(true);
    expect(slotCoversHour(slot, 1, 16)).toBe(true);
    expect(slotCoversHour(slot, 1, 17)).toBe(false);
    expect(slotCoversHour(slot, 2, 10)).toBe(false);
  });

  it('buildHourlyCapacity counts supply and tones', () => {
    const rows = buildHourlyCapacity({
      hours: [9, 10, 11],
      demandByHour: new Map([
        [9, 0],
        [10, 2],
        [11, 3],
      ]),
      weekday: 1,
      timeOffProviderIds: new Set(['p-off']),
      slots: [
        { provider_id: 'p1', weekday: 1, start_time: '09:00:00', end_time: '12:00:00' },
        { provider_id: 'p2', weekday: 1, start_time: '10:00:00', end_time: '12:00:00' },
        { provider_id: 'p-off', weekday: 1, start_time: '09:00:00', end_time: '12:00:00' },
      ],
    });
    expect(rows[0]).toMatchObject({ hour: 9, demand: 0, supply: 1, tone: 'idle' });
    expect(rows[1]).toMatchObject({ hour: 10, demand: 2, supply: 2, tone: 'tight' });
    expect(rows[2]).toMatchObject({ hour: 11, demand: 3, supply: 2, tone: 'over' });
    expect(capacityTone(1, 5)).toBe('ok');
    expect(capacityTone(4, 5)).toBe('tight');
  });
});
