import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { refundPaymentIntent } from '@urban-assist/integrations/stripe';
import { appendBookingStatus } from '@urban-assist/integrations/firebase';
import { requireAdminPermission } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('refund'),
  }),
  z.object({
    action: z.literal('penalize'),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal('note'),
    content: z.string().min(1),
  }),
]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { db: admin, user, roles } = await requireAdminPermission('can_manage_tickets');

    const parsed = ActionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    // Fetch the ticket & booking context
    const { data: ticket, error: ticketErr } = await admin
      .from('support_tickets')
      .select('*, bookings(*)')
      .eq('id', params.id)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'ticket_not_found' }, { status: 404 });
    }

    const booking = ticket.bookings;

    if (body.action === 'refund') {
      if (!booking) {
        return NextResponse.json({ error: 'no_booking_attached' }, { status: 400 });
      }

      // Fetch payment details
      const { data: payment } = await admin
        .from('payments')
        .select('*')
        .eq('booking_id', booking.id)
        .single();

      if (!payment || payment.method !== 'card' || !['succeeded', 'authorized'].includes(payment.status)) {
        return NextResponse.json({ error: 'no_refundable_payment' }, { status: 400 });
      }

      // Execute Stripe refund
      await refundPaymentIntent(payment.stripe_payment_intent_id);

      // Update payment status
      await admin.from('payments').update({ status: 'refunded' }).eq('id', payment.id);

      // Mark booking as cancelled or keep as completed but refunded
      const { data: cancelled, error: cancelError } = await admin
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id)
        .select('id, customer_id, provider_id')
        .single();
      if (cancelError || !cancelled) throw cancelError ?? new Error('booking_update_failed');

      await appendBookingStatus({
        booking_id: cancelled.id,
        customer_id: cancelled.customer_id,
        provider_id: cancelled.provider_id,
        status: 'cancelled',
        actor_id: user.id,
        actor_role: 'admin',
        source: 'support',
      });

      // Log event to audit log
      await (admin as any).rpc('append_admin_action_log', {
        p_actor_user_id: user.id,
        p_actor_role_code: roles[0] ?? null,
        p_action_type: 'DISPUTE_REFUND',
        p_entity_type: 'booking',
        p_entity_id: booking.id,
        p_context: { ticket_id: ticket.id, payment_id: payment.id, refunded: true },
        p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        p_user_agent: req.headers.get('user-agent'),
      });

      return NextResponse.json({ ok: true });

    } else if (body.action === 'penalize') {
      if (!booking || !booking.provider_id) {
        return NextResponse.json({ error: 'no_provider_to_penalize' }, { status: 400 });
      }

      // Log penalty warning event to analytics_events
      await admin.from('analytics_events').insert({
        profile_id: booking.provider_id,
        type: 'provider_penalty',
        payload: {
          ticket_id: ticket.id,
          booking_id: booking.id,
          reason: body.reason || 'No-show / Dispute resolution',
          penalized_by: user.id,
        },
      });

      // Append the immutable UI/admin action record.
      await (admin as any).rpc('append_admin_action_log', {
        p_actor_user_id: user.id,
        p_actor_role_code: roles[0] ?? null,
        p_action_type: 'PENALIZE_PROVIDER',
        p_entity_type: 'provider',
        p_entity_id: booking.provider_id,
        p_context: { ticket_id: ticket.id, reason: body.reason },
        p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        p_user_agent: req.headers.get('user-agent'),
      });

      return NextResponse.json({ ok: true });

    } else if (body.action === 'note') {
      // Log note event in analytics_events linked to the ticket
      await admin.from('analytics_events').insert({
        profile_id: user.id,
        type: 'ticket_note',
        payload: {
          ticket_id: ticket.id,
          booking_id: booking?.id || null,
          note: body.content,
        },
      });

      // Append the immutable UI/admin action record.
      await (admin as any).rpc('append_admin_action_log', {
        p_actor_user_id: user.id,
        p_actor_role_code: roles[0] ?? null,
        p_action_type: 'ADD_DISPUTE_NOTE',
        p_entity_type: 'support_ticket',
        p_entity_id: ticket.id,
        p_context: { note: body.content },
        p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        p_user_agent: req.headers.get('user-agent'),
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
