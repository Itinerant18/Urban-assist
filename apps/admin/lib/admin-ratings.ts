import { requireAdminPermission } from './admin-auth';

export type QualityAction =
  | 'warn'
  | 'open_ticket'
  | 'restrict_category';

/**
 * Quality follow-ups from low ratings (customer → provider).
 * // ponytail: reuses notes + tickets + deactivate services; no separate sanctions table
 */
export async function runQualityAction(input: {
  action: QualityAction;
  reviewId: string;
  note?: string;
}): Promise<{ ok: true; ticketId?: string } | { ok: false; error: string }> {
  const { db, user } = await requireAdminPermission('can_manage_users');
  const adminDb = db as any;

  const { data: review, error: reviewError } = await adminDb
    .from('reviews')
    .select(
      'id, booking_id, author_id, target_id, direction, rating, comment, booking:bookings(id, category_id, short_code)',
    )
    .eq('id', input.reviewId)
    .maybeSingle();

  if (reviewError) return { ok: false, error: reviewError.message };
  if (!review) return { ok: false, error: 'Review not found.' };
  if (review.direction !== 'customer_to_provider') {
    return { ok: false, error: 'Actions only apply to customer→provider reviews.' };
  }

  const booking = Array.isArray(review.booking) ? review.booking[0] : review.booking;
  const providerId = review.target_id as string;
  const stars = Number(review.rating);
  const comment = (review.comment as string | null)?.trim() || 'No comment';
  const extra = input.note?.trim();

  if (input.action === 'warn') {
    const noteText = [
      `Quality warning (${stars}★) on booking ${booking?.short_code ?? review.booking_id}.`,
      comment,
      extra ? `Ops note: ${extra}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const { error } = await adminDb.rpc('admin_add_provider_note', {
      p_provider_id: providerId,
      p_note: noteText.slice(0, 4000),
      p_actor_user_id: user.id,
      p_ip_address: null,
      p_user_agent: null,
    });
    if (error) return { ok: false, error: error.message };

    await adminDb.rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: null,
      p_action_type: 'QUALITY_WARN',
      p_entity_type: 'provider',
      p_entity_id: providerId,
      p_context: { review_id: review.id, booking_id: review.booking_id, rating: stars },
    });
    return { ok: true };
  }

  if (input.action === 'open_ticket') {
    const description = [
      `Low-rating follow-up (${stars}★).`,
      comment,
      extra ? `Ops: ${extra}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const { data: ticket, error } = await adminDb
      .from('support_tickets')
      .insert({
        booking_id: review.booking_id,
        raised_by: review.author_id,
        category: 'quality_review',
        description: description.slice(0, 2000),
        status: 'open',
      })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };

    await adminDb.rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: null,
      p_action_type: 'QUALITY_OPEN_TICKET',
      p_entity_type: 'support_ticket',
      p_entity_id: ticket.id,
      p_context: { review_id: review.id, provider_id: providerId },
    });
    return { ok: true, ticketId: ticket.id as string };
  }

  // restrict_category
  if (!booking?.category_id) {
    return { ok: false, error: 'Booking has no category to restrict.' };
  }

  const { error: deactivateError } = await adminDb
    .from('provider_services')
    .update({ is_active: false })
    .eq('provider_id', providerId)
    .eq('category_id', booking.category_id)
    .eq('is_active', true);

  if (deactivateError) return { ok: false, error: deactivateError.message };

  await adminDb.rpc('append_admin_action_log', {
    p_actor_user_id: user.id,
    p_actor_role_code: null,
    p_action_type: 'QUALITY_RESTRICT_CATEGORY',
    p_entity_type: 'provider',
    p_entity_id: providerId,
    p_context: {
      review_id: review.id,
      category_id: booking.category_id,
      booking_id: review.booking_id,
    },
  });

  return { ok: true };
}
