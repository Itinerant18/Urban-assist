import { describe, expect, it } from 'vitest';
import { isFullRefund, refundablePence } from './admin-ticket-macros';

describe('refundablePence', () => {
  it('subtracts already refunded', () => {
    expect(refundablePence(10_00, 2_50)).toBe(7_50);
  });

  it('floors at zero', () => {
    expect(refundablePence(10_00, 12_00)).toBe(0);
  });
});

describe('isFullRefund', () => {
  it('detects full remaining refund', () => {
    expect(isFullRefund(7_50, 7_50)).toBe(true);
    expect(isFullRefund(7_50, 5_00)).toBe(false);
  });
});
