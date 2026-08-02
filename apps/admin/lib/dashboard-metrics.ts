const LIQUIDITY_HOURS = [8, 10, 12, 14];

export function buildLiquidityData(
  bookings: Array<{ created_at: string }>,
  onlineProviders: number,
) {
  const bookingsByHour = new Map<number, number>();
  for (const booking of bookings) {
    const hour = new Date(booking.created_at).getHours();
    bookingsByHour.set(hour, (bookingsByHour.get(hour) ?? 0) + 1);
  }

  return LIQUIDITY_HOURS.map((hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    bookings: bookingsByHour.get(hour) ?? 0,
    providers: onlineProviders,
  }));
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : undefined;
  return Math.round(((current - previous) / previous) * 100);
}
