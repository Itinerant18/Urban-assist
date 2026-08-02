/**
 * Coarse platform booking windows for V1.
 * Not live provider inventory — admin still matches after the customer picks a window.
 */

export type DayOption = {
  /** Local calendar date YYYY-MM-DD */
  dateKey: string;
  label: string;
  weekday: string;
  dayNum: number;
  monthShort: string;
  isToday: boolean;
};

export type SlotOption = {
  /** Start of window as local datetime-local string (YYYY-MM-DDTHH:mm) */
  value: string;
  label: string;
  /** End hour for display, e.g. "10:00–12:00" */
  rangeLabel: string;
  disabled: boolean;
};

const SLOT_HOURS = [8, 10, 12, 14, 16, 18] as const;
const WINDOW_HOURS = 2;
const DAY_COUNT = 14;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function listBookingDays(from = new Date(), count = DAY_COUNT): DayOption[] {
  const today = startOfLocalDay(from);
  const out: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateKey = toDateKey(d);
    out.push({
      dateKey,
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthShort: d.toLocaleDateString('en-GB', { month: 'short' }),
      isToday: i === 0,
    });
  }
  return out;
}

export function listSlotsForDay(dateKey: string, now = new Date()): SlotOption[] {
  const [y, m, day] = dateKey.split('-').map(Number);
  return SLOT_HOURS.map((hour) => {
    const start = new Date(y!, m! - 1, day!, hour, 0, 0, 0);
    const endHour = hour + WINDOW_HOURS;
    const value = `${dateKey}T${pad(hour)}:00`;
    const rangeLabel = `${pad(hour)}:00–${pad(endHour)}:00`;
    const disabled = start.getTime() <= now.getTime();
    return {
      value,
      label: rangeLabel,
      rangeLabel,
      disabled,
    };
  });
}

/** First selectable slot across upcoming days (for form defaults). */
export function defaultFutureSlot(now = new Date()): string {
  for (const day of listBookingDays(now)) {
    const open = listSlotsForDay(day.dateKey, now).find((s) => !s.disabled);
    if (open) return open.value;
  }
  const fallback = new Date(now.getTime() + 60 * 60 * 1000);
  fallback.setMinutes(0, 0, 0);
  return `${toDateKey(fallback)}T${pad(fallback.getHours())}:00`;
}

export function dateKeyFromScheduledAt(scheduledAt: string): string {
  return scheduledAt.slice(0, 10);
}

export function formatSlotSummary(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  if (isNaN(d.getTime())) return 'No date selected';
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const hour = d.getHours();
  const end = hour + WINDOW_HOURS;
  return `${date} · ${pad(hour)}:00–${pad(end)}:00`;
}
