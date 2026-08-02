import { describe, expect, it } from 'vitest';
import { quote, resolveServicePrice } from './services/pricing-service';

// VAT_RATE is read once at module load from NEXT_PUBLIC_VAT_RATE, defaulting to 0.2.
// These assume the default; setting the env var in a test would not take effect
// because the module has already been evaluated.
const VAT = 0.2;

describe('quote', () => {
  it('applies VAT to an undiscounted price', () => {
    const q = quote(10_000);
    expect(q).toEqual({
      net_pence: 10_000,
      discount_pence: 0,
      subtotal_pence: 10_000,
      vat_pence: 2_000,
      total_pence: 12_000,
    });
  });

  it('applies a percent discount before VAT', () => {
    const q = quote(10_000, { discount_type: 'percent', discount_value: 10 });
    expect(q.discount_pence).toBe(1_000);
    expect(q.subtotal_pence).toBe(9_000);
    // VAT is charged on the discounted subtotal, not the original price.
    expect(q.vat_pence).toBe(1_800);
    expect(q.total_pence).toBe(10_800);
  });

  it('applies a fixed discount before VAT', () => {
    const q = quote(10_000, { discount_type: 'fixed', discount_value: 2_500 });
    expect(q.discount_pence).toBe(2_500);
    expect(q.subtotal_pence).toBe(7_500);
    expect(q.total_pence).toBe(9_000);
  });

  it('caps a fixed discount at the price so the total never goes negative', () => {
    const q = quote(3_000, { discount_type: 'fixed', discount_value: 10_000 });
    expect(q.discount_pence).toBe(3_000);
    expect(q.subtotal_pence).toBe(0);
    expect(q.vat_pence).toBe(0);
    expect(q.total_pence).toBe(0);
  });

  it('handles a 100% percent discount', () => {
    const q = quote(4_599, { discount_type: 'percent', discount_value: 100 });
    expect(q.subtotal_pence).toBe(0);
    expect(q.total_pence).toBe(0);
  });

  it('rounds VAT to whole pence rather than carrying fractions', () => {
    // 3333 * 0.2 = 666.6 -> 667
    const q = quote(3_333);
    expect(q.vat_pence).toBe(667);
    expect(Number.isInteger(q.vat_pence)).toBe(true);
    expect(q.total_pence).toBe(4_000);
  });

  it('rounds a percent discount to whole pence', () => {
    // 999 * 33 / 100 = 329.67 -> 330
    const q = quote(999, { discount_type: 'percent', discount_value: 33 });
    expect(q.discount_pence).toBe(330);
    expect(Number.isInteger(q.discount_pence)).toBe(true);
  });

  it('treats a null promo the same as no promo', () => {
    expect(quote(5_000, null)).toEqual(quote(5_000));
  });

  it('keeps subtotal + vat === total for a spread of prices', () => {
    for (const net of [0, 1, 99, 100, 1_234, 9_999, 250_000]) {
      const q = quote(net);
      expect(q.subtotal_pence + q.vat_pence).toBe(q.total_pence);
      expect(q.vat_pence).toBe(Math.round(q.subtotal_pence * VAT));
    }
  });
});

describe('resolveServicePrice', () => {
  it('uses the SKU price when the service is linked to a SKU', () => {
    const price = resolveServicePrice(
      { sku_id: 'sku-1', price_pence: 9_900 },
      { min_price_pence: 4_500 },
    );
    // The provider's own stored price is ignored; the platform rate wins.
    expect(price).toBe(4_500);
  });

  it('falls back to the stored price for legacy rows with no SKU', () => {
    const price = resolveServicePrice({ sku_id: null, price_pence: 9_900 }, null);
    expect(price).toBe(9_900);
  });

  it('falls back when the service has a sku_id but the SKU could not be loaded', () => {
    // A deleted or inactive SKU must not silently price the job at zero.
    const price = resolveServicePrice({ sku_id: 'sku-gone', price_pence: 7_500 }, null);
    expect(price).toBe(7_500);
  });

  it('falls back when the SKU row carries no price', () => {
    const price = resolveServicePrice(
      { sku_id: 'sku-1', price_pence: 7_500 },
      { min_price_pence: null },
    );
    expect(price).toBe(7_500);
  });

  it('honours a genuinely free SKU rather than treating 0 as missing', () => {
    const price = resolveServicePrice(
      { sku_id: 'sku-free', price_pence: 5_000 },
      { min_price_pence: 0 },
    );
    expect(price).toBe(0);
  });

  it('returns 0 rather than NaN when nothing is priced', () => {
    expect(resolveServicePrice({ sku_id: null, price_pence: null }, null)).toBe(0);
    expect(resolveServicePrice({}, null)).toBe(0);
  });
});
