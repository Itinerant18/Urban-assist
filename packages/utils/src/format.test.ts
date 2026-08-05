import { describe, expect, it } from 'vitest';
import {
  londonWallTimeToUtc,
  utcToLondonWallTime,
  londonDateKey,
  durationLabel,
} from './index';

describe('London wall-clock ↔ UTC', () => {
  it('maps BST (summer) wall time one hour back to UTC', () => {
    expect(londonWallTimeToUtc('2026-08-10T10:00').toISOString()).toBe('2026-08-10T09:00:00.000Z');
  });

  it('maps GMT (winter) wall time straight through', () => {
    expect(londonWallTimeToUtc('2026-01-10T10:00').toISOString()).toBe('2026-01-10T10:00:00.000Z');
  });

  it('handles the spring-forward morning (clocks jump 01:00 → 02:00)', () => {
    // 2026-03-29 is the last Sunday in March.
    expect(londonWallTimeToUtc('2026-03-29T08:00').toISOString()).toBe('2026-03-29T07:00:00.000Z');
    expect(londonWallTimeToUtc('2026-03-29T00:30').toISOString()).toBe('2026-03-29T00:30:00.000Z');
  });

  it('round-trips', () => {
    for (const wall of ['2026-08-10T18:00', '2026-01-02T08:00', '2026-10-25T12:00']) {
      expect(utcToLondonWallTime(londonWallTimeToUtc(wall))).toBe(wall);
    }
  });

  it('reads the London calendar day, not the device one', () => {
    // 23:30 UTC on 9 Aug is already 10 Aug in London (BST).
    expect(londonDateKey(new Date('2026-08-09T23:30:00Z'))).toBe('2026-08-10');
  });
});

describe('durationLabel', () => {
  it('renders the offer TTL in the unit that reads naturally', () => {
    expect(durationLabel(600)).toBe('10 minutes');
    expect(durationLabel(60)).toBe('1 minute');
    expect(durationLabel(90)).toBe('90 seconds');
  });
});
