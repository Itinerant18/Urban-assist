import { describe, expect, it } from 'vitest';
import {
  applyBookingPreset,
  readBookingFilters,
  todayLondonIso,
} from './admin-bookings';

const emptyBase = {
  unassigned: false,
  withPreference: false,
};

describe('applyBookingPreset', () => {
  it('expands needs_match and preference_pending', () => {
    expect(applyBookingPreset('needs_match', emptyBase).unassigned).toBe(true);
    expect(applyBookingPreset('preference_pending', emptyBase)).toMatchObject({
      unassigned: true,
      withPreference: true,
      preset: 'preference_pending',
    });
  });

  it('sets today window and disputed status', () => {
    expect(applyBookingPreset('today', emptyBase, '2026-08-03')).toMatchObject({
      from: '2026-08-03',
      to: '2026-08-03',
      preset: 'today',
    });
    expect(applyBookingPreset('disputed', emptyBase)).toMatchObject({
      status: 'disputed',
      preset: 'disputed',
    });
  });

  it('ignores unknown presets', () => {
    expect(applyBookingPreset('nope', emptyBase).preset).toBeNull();
  });
});

describe('readBookingFilters', () => {
  it('applies preset then lets explicit params override', () => {
    expect(readBookingFilters({ preset: 'needs_match' }, '2026-08-03')).toMatchObject({
      unassigned: true,
      preset: 'needs_match',
    });
    expect(
      readBookingFilters({ preset: 'today', from: '2026-01-01', to: '2026-01-02' }, '2026-08-03'),
    ).toMatchObject({
      from: '2026-01-01',
      to: '2026-01-02',
      preset: 'today',
    });
  });
});

describe('todayLondonIso', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayLondonIso(new Date('2026-08-03T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
