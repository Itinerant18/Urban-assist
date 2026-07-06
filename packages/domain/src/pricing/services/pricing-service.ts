const VAT_RATE = Number(process.env.NEXT_PUBLIC_VAT_RATE ?? 0.2);

export interface Promo {
  discount_type: 'percent' | 'fixed';
  discount_value: number;
}

export interface PriceQuote {
  net_pence: number;
  discount_pence: number;
  subtotal_pence: number;
  vat_pence: number;
  total_pence: number;
}

export function quote(net_pence: number, promo?: Promo | null): PriceQuote {
  const discount = promo
    ? promo.discount_type === 'percent'
      ? Math.round((net_pence * promo.discount_value) / 100)
      : Math.min(promo.discount_value, net_pence)
    : 0;
  const subtotal = Math.max(0, net_pence - discount);
  const vat = Math.round(subtotal * VAT_RATE);
  return {
    net_pence,
    discount_pence: discount,
    subtotal_pence: subtotal,
    vat_pence: vat,
    total_pence: subtotal + vat,
  };
}
