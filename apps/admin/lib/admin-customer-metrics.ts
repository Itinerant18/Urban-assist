export type CustomerBookingLike = {
  status: string;
  total_pence: number | null;
};

export type CustomerPaymentLike = {
  status: string;
  amount_pence: number | null;
};

export type CustomerValueMetrics = {
  bookingCount: number;
  completedCount: number;
  cancelledCount: number;
  /** Completed booking totals — primary LTV signal. */
  ltvPence: number;
  avgOrderPence: number;
  /** Succeeded payment totals (0 if none loaded). */
  paidPence: number;
};

/** Pure LTV / booking rollups for customer detail. */
export function computeCustomerValueMetrics(
  bookings: CustomerBookingLike[],
  payments: CustomerPaymentLike[] = [],
): CustomerValueMetrics {
  const bookingCount = bookings.length;
  const completed = bookings.filter((b) => b.status === 'completed');
  const cancelledCount = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'no_show',
  ).length;
  const ltvPence = completed.reduce((sum, b) => sum + (b.total_pence ?? 0), 0);
  const avgOrderPence = completed.length ? Math.round(ltvPence / completed.length) : 0;
  const paidPence = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + (p.amount_pence ?? 0), 0);

  return {
    bookingCount,
    completedCount: completed.length,
    cancelledCount,
    ltvPence,
    avgOrderPence,
    paidPence,
  };
}

export function isHighCancelRisk(metrics: CustomerValueMetrics): boolean {
  return metrics.bookingCount >= 3 && metrics.cancelledCount / metrics.bookingCount > 0.4;
}
