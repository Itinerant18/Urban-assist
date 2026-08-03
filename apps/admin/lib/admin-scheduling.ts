import { hourInLondon } from '@urban-assist/domain/pricing';

export type SchedulingDayFilters = {
  date: string;
  categoryId: string | null;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** YYYY-MM-DD in local calendar sense — defaults to today (UTC date stamp, same as bookings filters). */
export function todayYmd(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function readSchedulingFilters(
  searchParams: Record<string, string | string[] | undefined>,
  now = new Date(),
): SchedulingDayFilters {
  const raw = firstParam(searchParams.date)?.trim();
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayYmd(now);
  const categoryId = firstParam(searchParams.category) || null;
  return { date, categoryId };
}

export type SchedulingBookingLike = {
  id: string;
  scheduled_at: string;
};

/**
 * Group bookings into hour buckets (0–23) by scheduled_at hour in Europe/London.
 * Supply (availability_slots.start_time/end_time) is a local clock, so demand
 * must be bucketed in the same clock — UTC here shifted load% by an hour all BST.
 */
export function bucketBookingsByHour<T extends SchedulingBookingLike>(
  bookings: T[],
): Map<number, T[]> {
  const buckets = new Map<number, T[]>();
  for (const booking of bookings) {
    const hour = hourInLondon(booking.scheduled_at);
    const list = buckets.get(hour) ?? [];
    list.push(booking);
    buckets.set(hour, list);
  }
  for (const list of buckets.values()) {
    list.sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );
  }
  return buckets;
}

/** Ops day grid hours (inclusive start, exclusive end). */
export function schedulingGridHours(startHour = 7, endHour = 21): number[] {
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h += 1) hours.push(h);
  return hours;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** 0=Sunday … 6=Saturday — matches availability_slots + matching-engine. */
export function weekdayFromYmd(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

export type AvailabilitySlotLike = {
  provider_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

/** True when hour bucket [h, h+1) overlaps the slot window on that weekday. */
export function slotCoversHour(
  slot: AvailabilitySlotLike,
  weekday: number,
  hour: number,
): boolean {
  if (slot.weekday !== weekday) return false;
  const startH = Number.parseInt(String(slot.start_time).slice(0, 2), 10);
  const endH = Number.parseInt(String(slot.end_time).slice(0, 2), 10);
  if (!Number.isFinite(startH) || !Number.isFinite(endH)) return false;
  return hour >= startH && hour < endH;
}

export type CapacityTone = 'idle' | 'ok' | 'tight' | 'over';

export type CapacityHourRow = {
  hour: number;
  demand: number;
  supply: number;
  /** demand / supply when supply > 0; otherwise null. */
  load: number | null;
  tone: CapacityTone;
};

export function capacityTone(demand: number, supply: number): CapacityTone {
  if (demand <= 0) return 'idle';
  if (supply <= 0 || demand > supply) return 'over';
  if (demand / supply >= 0.8) return 'tight';
  return 'ok';
}

/**
 * Hourly demand vs supply snapshot (not a full capacity engine).
 * Supply = unique providers with a covering weekly window and not on time-off.
 */
export function buildHourlyCapacity(input: {
  hours: number[];
  demandByHour: Map<number, number>;
  slots: AvailabilitySlotLike[];
  weekday: number;
  timeOffProviderIds: ReadonlySet<string>;
  /** When set, only these provider IDs count toward supply (e.g. category offerers). */
  eligibleProviderIds?: ReadonlySet<string> | null;
}): CapacityHourRow[] {
  return input.hours.map((hour) => {
    const demand = input.demandByHour.get(hour) ?? 0;
    const supplyIds = new Set<string>();
    for (const slot of input.slots) {
      if (input.timeOffProviderIds.has(slot.provider_id)) continue;
      if (input.eligibleProviderIds && !input.eligibleProviderIds.has(slot.provider_id)) {
        continue;
      }
      if (slotCoversHour(slot, input.weekday, hour)) {
        supplyIds.add(slot.provider_id);
      }
    }
    const supply = supplyIds.size;
    return {
      hour,
      demand,
      supply,
      load: supply > 0 ? demand / supply : null,
      tone: capacityTone(demand, supply),
    };
  });
}
