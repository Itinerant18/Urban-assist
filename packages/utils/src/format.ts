const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export const pence = (n: number) => GBP.format(n / 100);

export const ukDate = (iso: string | Date) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
    typeof iso === 'string' ? new Date(iso) : iso,
  );

export const ukDateTime = (iso: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);

export const miles = (km: number) => `${(km * 0.621371).toFixed(1)} mi`;

/**
 * Great-circle distance in km. Lives here next to `miles()` because the two are
 * always used as a pair: compute, then display.
 *
 * ponytail: the matching engine had a private copy of this. One implementation,
 * two consumers (scoring on the server, distance display in the provider UI) —
 * a second copy is how they drift.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a1 = (lat1 * Math.PI) / 180;
  const a2 = (lat2 * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function formatUkPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('44')) {
    const rest = digits.slice(2);
    return `+44 ${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`.trim();
  }
  if (digits.startsWith('0')) {
    return `+44 ${digits.slice(1, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`.trim();
  }
  return input;
}

export const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
