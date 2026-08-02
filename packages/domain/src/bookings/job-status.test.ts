import { describe, expect, it } from 'vitest';
import { JOB_STATUS_TRANSITIONS } from './services/booking-service';

const can = (from: string, to: string) =>
  JOB_STATUS_TRANSITIONS[from]?.includes(to) ?? false;

describe('JOB_STATUS_TRANSITIONS', () => {
  it('allows the happy path end to end', () => {
    expect(can('assigned', 'on_the_way')).toBe(true);
    expect(can('on_the_way', 'arrived')).toBe(true);
    expect(can('arrived', 'in_progress')).toBe(true);
    expect(can('in_progress', 'completed')).toBe(true);
  });

  it('never allows moving backwards', () => {
    expect(can('on_the_way', 'assigned')).toBe(false);
    expect(can('arrived', 'on_the_way')).toBe(false);
    expect(can('in_progress', 'arrived')).toBe(false);
    expect(can('completed', 'in_progress')).toBe(false);
  });

  it('cannot skip arrival to start a job', () => {
    // in_progress requires the customer's 4-digit start code, which is only
    // presented once the provider has marked themselves arrived.
    expect(can('assigned', 'in_progress')).toBe(false);
    expect(can('on_the_way', 'in_progress')).toBe(false);
  });

  it('cannot skip straight to completed', () => {
    expect(can('assigned', 'completed')).toBe(false);
    expect(can('on_the_way', 'completed')).toBe(false);
    expect(can('arrived', 'completed')).toBe(false);
  });

  it('allows cancelling only before work has started', () => {
    expect(can('assigned', 'cancelled')).toBe(true);
    expect(can('on_the_way', 'cancelled')).toBe(true);
    expect(can('arrived', 'cancelled')).toBe(true);
    // Once in progress the money and the customer's time are committed; the only
    // way out is completing, or an admin intervening out of band.
    expect(can('in_progress', 'cancelled')).toBe(false);
  });

  it('exposes canProviderCancel for UI gating', async () => {
    const { canProviderCancel } = await import('./services/booking-service');
    expect(canProviderCancel('assigned')).toBe(true);
    expect(canProviderCancel('in_progress')).toBe(false);
    expect(canProviderCancel('completed')).toBe(false);
  });

  it('treats completed and cancelled as terminal', () => {
    expect(JOB_STATUS_TRANSITIONS.completed).toBeUndefined();
    expect(JOB_STATUS_TRANSITIONS.cancelled).toBeUndefined();
  });

  it('gives providers no transition out of a pre-assignment status', () => {
    // pending_match and unmatched belong to the matching engine, not the provider.
    expect(JOB_STATUS_TRANSITIONS.pending_match).toBeUndefined();
    expect(JOB_STATUS_TRANSITIONS.unmatched).toBeUndefined();
    expect(JOB_STATUS_TRANSITIONS.disputed).toBeUndefined();
  });

  it('only ever targets real booking_status enum values', () => {
    const valid = new Set([
      'pending_match',
      'assigned',
      'on_the_way',
      'arrived',
      'in_progress',
      'completed',
      'cancelled',
      'unmatched',
      'disputed',
    ]);
    for (const [from, targets] of Object.entries(JOB_STATUS_TRANSITIONS)) {
      expect(valid.has(from)).toBe(true);
      for (const to of targets) expect(valid.has(to)).toBe(true);
    }
  });
});
