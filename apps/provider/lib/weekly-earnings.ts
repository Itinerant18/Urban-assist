export interface WeeklyEarning {
  date: string;
  day: string;
  amountPence: number;
  heightPercent: number;
}

interface CompletedBookingAmount {
  completed_at: string | null;
  price_pence: number | null;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function weeklyWindow(now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  return { start, end };
}

export function buildWeeklyEarnings(
  bookings: CompletedBookingAmount[],
  now = new Date(),
): WeeklyEarning[] {
  const { start } = weeklyWindow(now);
  const amounts = new Map<string, number>();

  for (const booking of bookings) {
    if (!booking.completed_at) continue;
    const key = localDateKey(new Date(booking.completed_at));
    amounts.set(key, (amounts.get(key) ?? 0) + (booking.price_pence ?? 0));
  }

  const series = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDateKey(date);
    return {
      date: key,
      day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      amountPence: amounts.get(key) ?? 0,
      heightPercent: 0,
    };
  });
  const max = Math.max(...series.map((entry) => entry.amountPence));

  return series.map((entry) => ({
    ...entry,
    heightPercent: max === 0 ? 0 : Math.round((entry.amountPence / max) * 100),
  }));
}
