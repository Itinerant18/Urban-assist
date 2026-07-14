import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { refundPaymentIntent } from '@urban-assist/integrations/stripe';

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
    const db = getSupabaseServer();
    
    // Authenticate admin user
    const { data: { user }, error: authErr } = await db.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const parsed = ActionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    const admin = createServiceRole();

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
      await admin.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);

      // Log event to audit log
      await admin.from('audit_log').insert({
        actor_id: user.id,
        action: 'ticket.issue_refund',
        entity_type: 'booking',
        entity_id: booking.id,
        new_data: { payment_id: payment.id, refunded: true },
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

      // Log action to audit_log
      await admin.from('audit_log').insert({
        actor_id: user.id,
        action: 'ticket.penalize_provider',
        entity_type: 'profile',
        entity_id: booking.provider_id,
        new_data: { ticket_id: ticket.id, reason: body.reason },
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

      // Add to audit_log
      await admin.from('audit_log').insert({
        actor_id: user.id,
        action: 'ticket.add_note',
        entity_type: 'support_ticket',
        entity_id: ticket.id,
        new_data: { note: body.content },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
