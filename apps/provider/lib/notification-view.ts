/**
 * Presentation for a `notifications` row.
 *
 * The customer app reads `payload.title` / `payload.body`, but nothing writes those
 * for providers — the rows inserted by the matching engine, payout release and job
 * status routes carry only ids (`booking_id`, `offer_id`, `amount_pence`). So the
 * provider centre maps on `type` and falls back to the raw type for anything new,
 * which keeps unknown notifications visible rather than blank.
 */
export interface NotificationView {
  title: string;
  body?: string;
  href?: string;
}

export function notificationView(
  type: string,
  payload: any,
): NotificationView {
  const bookingId = payload?.booking_id;
  const job = bookingId ? `/jobs/${bookingId}` : undefined;

  switch (type) {
    case 'offer.new':
      return {
        title: 'New job offer',
        body: 'A customer is waiting — respond before the offer expires.',
        href: payload?.offer_id ? `/offers/${payload.offer_id}` : '/offers',
      };
    case 'booking.matched':
      return { title: 'Job assigned to you', href: job };
    case 'booking.cancelled':
      return {
        title: 'Booking cancelled',
        body: payload?.reason ?? undefined,
        href: job,
      };
    case 'booking.completed':
      return { title: 'Job marked complete', href: job };
    case 'message.new':
      return { title: 'New message from a customer', href: job };
    case 'review.received':
      return {
        title: payload?.rating ? `You received a ${payload.rating}★ review` : 'New review received',
        href: '/account',
      };
    case 'payment.released':
      return { title: 'Payout released', href: '/earnings' };
    case 'payment.succeeded':
      return { title: 'Payment received', href: job ?? '/earnings' };
    default:
      // Unknown type: show it rather than hide it. A blank card is worse than a slug.
      return { title: type, href: job };
  }
}
