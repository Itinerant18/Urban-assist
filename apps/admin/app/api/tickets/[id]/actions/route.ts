import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { refundPaymentIntent, stripe } from '@urban-assist/integrations/stripe';
import { appendBookingStatus } from '@urban-assist/integrations/firebase';
import { requireAdminPermission } from '../../../../../lib/admin-auth';
import { isFullRefund, refundablePence } from '../../../../../lib/admin-ticket-macros';

export const dynamic = 'force-dynamic';

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('refund'),
    /** Omit or null = full remaining balance. */
    amount_pence: z.number().int().positive().optional().nullable(),
    reason: z.string().trim().min(1).max(300),
    /** Defaults to true when refund consumes the full remaining balance. */
    cancel_booking: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('credit'),
    amount_pence: z.number().int().positive().max(500_00),
    reason: z.string().trim().min(1).max(300),
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

      const { data: payment } = await admin
        .from('payments')
        .select('*')
        .eq('booking_id', booking.id)
        .in('status', ['succeeded', 'authorized', 'refunded'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        !payment ||
        payment.method !== 'card' ||
        !payment.stripe_payment_intent_id ||
        !['succeeded', 'authorized', 'refunded'].includes(payment.status)
      ) {
        return NextResponse.json({ error: 'no_refundable_payment' }, { status: 400 });
      }

      // amount_refunded lives on the Charge, not the PaymentIntent.
      const pi = await stripe().paymentIntents.retrieve(payment.stripe_payment_intent_id, {
        expand: ['latest_charge'],
      });
      const charge = typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
      const alreadyRefunded = charge?.amount_refunded ?? 0;
      const remaining = refundablePence(pi.amount, alreadyRefunded);
      if (remaining <= 0) {
        return NextResponse.json({ error: 'nothing_left_to_refund' }, { status: 400 });
      }

      const refundAmount =
        body.amount_pence == null ? remaining : Math.min(body.amount_pence, remaining);
      if (refundAmount <= 0) {
        return NextResponse.json({ error: 'invalid_refund_amount' }, { status: 400 });
      }

      const full = isFullRefund(remaining, refundAmount);
      // Keyed on the already-refunded snapshot: a double-click issues one refund,
      // while a genuine second partial (new snapshot) still goes through.
      await refundPaymentIntent(
        payment.stripe_payment_intent_id,
        refundAmount,
        `urban-assist:refund:${payment.stripe_payment_intent_id}:${alreadyRefunded + refundAmount}`,
      );

      if (full && alreadyRefunded + refundAmount >= payment.amount_pence) {
        await admin.from('payments').update({ status: 'refunded' }).eq('id', payment.id);
      }

      const shouldCancel = body.cancel_booking ?? full;
      if (shouldCancel && booking.status !== 'cancelled') {
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
      }

      await admin.from('analytics_events').insert({
        profile_id: ticket.raised_by,
        type: 'ticket_refund',
        payload: {
          ticket_id: ticket.id,
          booking_id: booking.id,
          payment_id: payment.id,
          amount_pence: refundAmount,
          reason: body.reason,
          full,
          cancelled: shouldCancel,
        },
      });

      await (admin as any).rpc('append_admin_action_log', {
        p_actor_user_id: user.id,
        p_actor_role_code: roles[0] ?? null,
        p_action_type: 'DISPUTE_REFUND',
        p_entity_type: 'booking',
        p_entity_id: booking.id,
        p_context: {
          ticket_id: ticket.id,
          payment_id: payment.id,
          amount_pence: refundAmount,
          reason: body.reason,
          full,
          cancelled: shouldCancel,
        },
        p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        p_user_agent: req.headers.get('user-agent'),
      });

      return NextResponse.json({ ok: true, amount_pence: refundAmount, full, cancelled: shouldCancel });
    }

    if (body.action === 'credit') {
      await (admin as any).from('wallet_ledger').insert({
        profile_id: ticket.raised_by,
        booking_id: booking?.id ?? null,
        amount_pence: body.amount_pence,
        reason: 'admin_goodwill',
      });

      // The customer has no other way to learn a credit landed.
      await admin.from('notifications').insert({
        profile_id: ticket.raised_by,
        type: 'wallet_credit',
        payload: {
          amount_pence: body.amount_pence,
          reason: body.reason,
          ticket_id: ticket.id,
        },
      });

      await admin.from('analytics_events').insert({
        profile_id: ticket.raised_by,
        type: 'ticket_credit',
        payload: {
          ticket_id: ticket.id,
          booking_id: booking?.id || null,
          amount_pence: body.amount_pence,
          reason: body.reason,
        },
      });

      await (admin as any).rpc('append_admin_action_log', {
        p_actor_user_id: user.id,
        p_actor_role_code: roles[0] ?? null,
        p_action_type: 'WALLET_GRANT',
        p_entity_type: 'customer',
        p_entity_id: ticket.raised_by,
        p_context: {
          ticket_id: ticket.id,
          amount_pence: body.amount_pence,
          reason: body.reason,
        },
        p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        p_user_agent: req.headers.get('user-agent'),
      });

      return NextResponse.json({ ok: true });
    }

    if (body.action === 'penalize') {
      if (!booking || !booking.provider_id) {
        return NextResponse.json({ error: 'no_provider_to_penalize' }, { status: 400 });
      }

      // Penalty must land somewhere ops actually looks: the provider detail page
      // reads provider_admin_notes. Analytics alone made this action decorative.
      // ponytail: no strikes engine — ratings warn/restrict is the enforcement path.
      await (admin as any).from('provider_admin_notes').insert({
        provider_id: booking.provider_id,
        admin_user_id: user.id,
        note: `PENALTY — ${body.reason || 'No-show / Dispute resolution'} (ticket ${ticket.id.slice(0, 8)})`,
      });

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
    }

    if (body.action === 'note') {
      await admin.from('analytics_events').insert({
        profile_id: user.id,
        type: 'ticket_note',
        payload: {
          ticket_id: ticket.id,
          booking_id: booking?.id || null,
          note: body.content,
        },
      });

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
    const status =
      e.message === 'unauthorized' || e.message === 'mfa_required'
        ? 401
        : e.message === 'forbidden'
          ? 403
          : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
