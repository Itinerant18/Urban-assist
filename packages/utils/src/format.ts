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

export const UK_POSTCODE_RE =
  /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function getBookingOtp(bookingId: string): string {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) {
    hash = bookingId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return String(Math.abs(hash) % 10000).padStart(4, '0');
}
