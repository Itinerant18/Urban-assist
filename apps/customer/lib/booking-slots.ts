/**
 * Coarse platform booking windows for V1.
 * Not live provider inventory — admin still matches after the customer picks a window.
 *
 * Every date and hour below is a **London** wall-clock value, never the device's.
 * The window a customer taps is a UK time; building it from `new Date()` locals
 * meant a customer in Madrid picked 10:00 and booked a 09:00 UK visit.
 */

import {
  londonDateKey,
  londonParts,
  londonWallTimeToUtc,
  LONDON_TZ,
} from '@urban-assist/utils';

export type DayOption = {
  /** London calendar date YYYY-MM-DD */
  dateKey: string;
  label: string;
  weekday: string;
  dayNum: number;
  monthShort: string;
  isToday: boolean;
};

export type SlotOption = {
  /** Start of window as a London wall-clock string (YYYY-MM-DDTHH:mm) */
  value: string;
  label: string;
  /** End hour for display, e.g. "10:00–12:00" */
  rangeLabel: string;
  disabled: boolean;
};

const SLOT_HOURS = [8, 10, 12, 14, 16, 18] as const;
const WINDOW_HOURS = 2;
const DAY_COUNT = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Midday anchor avoids DST days where local midnight ±1h crosses a date boundary. */
function londonNoonInstant(dateKey: string): Date {
  return londonWallTimeToUtc(`${dateKey}T12:00`);
}

const dayFmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: LONDON_TZ });

export function listBookingDays(from = new Date(), count = DAY_COUNT): DayOption[] {
  const todayKey = londonDateKey(from);
  const out: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    // Step in real days from today's London noon, then re-read the London date.
    const instant = new Date(londonNoonInstant(todayKey).getTime() + i * DAY_MS);
    const p = londonParts(instant);
    out.push({
      dateKey: p.dateKey,
      label: dayFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(instant),
      weekday: dayFmt({ weekday: 'short' }).format(instant),
      dayNum: p.day,
      monthShort: dayFmt({ month: 'short' }).format(instant),
      isToday: i === 0,
    });
  }
  return out;
}

export function listSlotsForDay(dateKey: string, now = new Date()): SlotOption[] {
  return SLOT_HOURS.map((hour) => {
    const value = `${dateKey}T${pad(hour)}:00`;
    const rangeLabel = `${pad(hour)}:00–${pad(hour + WINDOW_HOURS)}:00`;
    return {
      value,
      label: rangeLabel,
      rangeLabel,
      disabled: londonWallTimeToUtc(value).getTime() <= now.getTime(),
    };
  });
}

/** First selectable slot across upcoming days (for form defaults). */
export function defaultFutureSlot(now = new Date()): string {
  for (const day of listBookingDays(now)) {
    const open = listSlotsForDay(day.dateKey, now).find((s) => !s.disabled);
    if (open) return open.value;
  }
  // Every window in the horizon is gone — fall back to the next round hour in London.
  const p = londonParts(new Date(now.getTime() + 60 * 60 * 1000));
  return `${p.dateKey}T${pad(p.hour)}:00`;
}

/** UTC instant (or London wall-clock) → the day chip it belongs to. */
export function dateKeyFromScheduledAt(scheduledAt: string): string {
  // A wall-clock string has no zone suffix; anything else is an instant.
  return /(Z|[+-]\d{2}:?\d{2})$/.test(scheduledAt)
    ? londonDateKey(new Date(scheduledAt))
    : scheduledAt.slice(0, 10);
}

export function formatSlotSummary(scheduledAt: string): string {
  const start = /(Z|[+-]\d{2}:?\d{2})$/.test(scheduledAt)
    ? new Date(scheduledAt)
    : londonWallTimeToUtc(scheduledAt);
  if (isNaN(start.getTime())) return 'No date selected';
  const p = londonParts(start);
  const date = dayFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(start);
  return `${date} · ${pad(p.hour)}:00–${pad(p.hour + WINDOW_HOURS)}:00`;
}

/** The value to send to the API — the chosen London window as a UTC instant. */
export function slotToIso(value: string): string {
  return londonWallTimeToUtc(value).toISOString();
}
