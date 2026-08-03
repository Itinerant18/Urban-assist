import { describe, expect, it } from 'vitest';
import {
  buildBookingStatusBreakdown,
  buildNamedCountBreakdown,
  percentageChange,
} from './dashboard-metrics';

describe('buildBookingStatusBreakdown', () => {
  it('always includes live ops statuses and drops empty non-key ones', () => {
    expect(
      buildBookingStatusBreakdown([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'disputed' },
      ]),
    ).toEqual([
      { status: 'pending_match', label: 'pending match', count: 0 },
      { status: 'assigned', label: 'assigned', count: 0 },
      { status: 'in_progress', label: 'in progress', count: 0 },
      { status: 'completed', label: 'completed', count: 2 },
      { status: 'disputed', label: 'disputed', count: 1 },
    ]);
  });
});

describe('buildNamedCountBreakdown', () => {
  it('ranks labels and caps at limit', () => {
    expect(
      buildNamedCountBreakdown(
        ['Electrical', 'Cleaning', 'electrical', 'Plumbing', null],
        { limit: 3, ids: ['e', 'c', 'e', 'p', null] },
      ),
    ).toEqual([
      { id: 'e', label: 'Electrical', count: 2, share: 2 / 5 },
      { id: 'c', label: 'Cleaning', count: 1, share: 1 / 5 },
      { id: 'p', label: 'Plumbing', count: 1, share: 1 / 5 },
    ]);
  });
});

describe('percentageChange', () => {
  it('handles zero baseline', () => {
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(5, 0)).toBeUndefined();
    expect(percentageChange(12, 10)).toBe(20);
  });
});
