const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export const pence = (n: number) => GBP.format(n / 100);

/**
 * Every booking time in this product is a UK time. Formatting and slot maths are
 * therefore pinned to Europe/London rather than the device clock — otherwise a
 * customer booking from Madrid picks "10:00" and gets a 09:00 UK visit.
 */
export const LONDON_TZ = 'Europe/London';

export const ukDate = (iso: string | Date) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: LONDON_TZ }).format(
    typeof iso === 'string' ? new Date(iso) : iso,
  );

export const ukDateTime = (iso: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: LONDON_TZ,
  }).format(typeof iso === 'string' ? new Date(iso) : iso);

const LONDON_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: LONDON_TZ,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export interface LondonParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** YYYY-MM-DD in London. */
  dateKey: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Wall-clock fields an observer in London would read off an instant. */
export function londonParts(instant: Date = new Date()): LondonParts {
  const p: Record<string, string> = {};
  for (const part of LONDON_PARTS.formatToParts(instant)) p[part.type] = part.value;
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  // Some engines render midnight as hour "24"; normalise before use.
  const hour = Number(p.hour) % 24;
  return {
    year,
    month,
    day,
    hour,
    minute: Number(p.minute),
    dateKey: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

function londonOffsetMs(instant: Date): number {
  const p = londonParts(instant);
  const secs = Number(
    LONDON_PARTS.formatToParts(instant).find((x) => x.type === 'second')?.value ?? '0',
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, secs) - instant.getTime();
}

/**
 * London wall-clock string (`YYYY-MM-DDTHH:mm`) → the UTC instant it names.
 *
 * `new Date('2026-08-10T10:00')` parses in the *device's* zone, so the same slot
 * produced different absolute times per traveller. Two passes because the naive
 * guess can land on the wrong side of a DST switch.
 */
export function londonWallTimeToUtc(wall: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(wall);
  if (!m) return new Date(NaN);
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  const once = guess - londonOffsetMs(new Date(guess));
  return new Date(guess - londonOffsetMs(new Date(once)));
}

/** UTC instant → London wall-clock string (`YYYY-MM-DDTHH:mm`). */
export function utcToLondonWallTime(instant: string | Date): string {
  const p = londonParts(typeof instant === 'string' ? new Date(instant) : instant);
  return `${p.dateKey}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** YYYY-MM-DD for an instant, as seen in London. */
export const londonDateKey = (instant: Date = new Date()) => londonParts(instant).dateKey;

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
