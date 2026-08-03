import { describe, expect, it } from 'vitest';
import {
  applyPricingModifiers,
  clampAdjustmentPercent,
  hourInLondon,
  normalizePostcodePrefix,
  pricingModifierMatches,
  type PricingModifierRule,
} from './services/pricing-modifiers';

const baseRule = (partial: Partial<PricingModifierRule>): PricingModifierRule => ({
  postcode_prefix: null,
  start_hour: null,
  end_hour: null,
  category_id: null,
  adjustment_percent: 10,
  is_active: true,
  ...partial,
});

describe('normalizePostcodePrefix', () => {
  it('uppercases and strips spaces', () => {
    expect(normalizePostcodePrefix('sw1 a')).toBe('SW1A');
  });
});

describe('pricingModifierMatches', () => {
  it('matches postcode prefix', () => {
    const rule = baseRule({ postcode_prefix: 'SW1' });
    expect(
      pricingModifierMatches(rule, { postcode: 'SW1A 1AA', hour: 12, categoryId: null }),
    ).toBe(true);
    expect(
      pricingModifierMatches(rule, { postcode: 'N1 0PQ', hour: 12, categoryId: null }),
    ).toBe(false);
  });

  it('matches daytime window', () => {
    const rule = baseRule({ start_hour: 17, end_hour: 21 });
    expect(
      pricingModifierMatches(rule, { postcode: null, hour: 18, categoryId: null }),
    ).toBe(true);
    expect(
      pricingModifierMatches(rule, { postcode: null, hour: 16, categoryId: null }),
    ).toBe(false);
  });

  it('matches overnight window', () => {
    const rule = baseRule({ start_hour: 22, end_hour: 6 });
    expect(
      pricingModifierMatches(rule, { postcode: null, hour: 23, categoryId: null }),
    ).toBe(true);
    expect(
      pricingModifierMatches(rule, { postcode: null, hour: 5, categoryId: null }),
    ).toBe(true);
    expect(
      pricingModifierMatches(rule, { postcode: null, hour: 12, categoryId: null }),
    ).toBe(false);
  });

  it('filters by category and inactive', () => {
    expect(
      pricingModifierMatches(baseRule({ category_id: 'cat-a' }), {
        postcode: null,
        hour: 10,
        categoryId: 'cat-b',
      }),
    ).toBe(false);
    expect(
      pricingModifierMatches(baseRule({ is_active: false }), {
        postcode: null,
        hour: 10,
        categoryId: null,
      }),
    ).toBe(false);
  });
});

describe('applyPricingModifiers', () => {
  it('stacks matching percents and leaves base alone when none match', () => {
    const rules = [
      baseRule({ adjustment_percent: 10, postcode_prefix: 'SW' }),
      baseRule({ adjustment_percent: 5, start_hour: 17, end_hour: 21 }),
      baseRule({ adjustment_percent: 50, postcode_prefix: 'E1' }),
    ];
    expect(
      applyPricingModifiers(10_000, rules, {
        postcode: 'SW1A',
        hour: 18,
        categoryId: null,
      }),
    ).toBe(11_500);
    expect(
      applyPricingModifiers(10_000, rules, {
        postcode: 'N1',
        hour: 10,
        categoryId: null,
      }),
    ).toBe(10_000);
  });

  it('never goes below zero and clamps stack', () => {
    expect(clampAdjustmentPercent(200)).toBe(100);
    expect(clampAdjustmentPercent(-80)).toBe(-50);
    expect(
      applyPricingModifiers(1_000, [baseRule({ adjustment_percent: -50 })], {
        postcode: null,
        hour: 0,
        categoryId: null,
      }),
    ).toBe(500);
  });
});

describe('hourInLondon', () => {
  it('returns a 0–23 hour for a known instant', () => {
    const hour = hourInLondon('2026-08-03T12:00:00.000Z');
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });
});
