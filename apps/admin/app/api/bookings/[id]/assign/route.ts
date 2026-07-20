import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendBookingStatus } from '@urban-assist/integrations/firebase';
import { requireAdminPermission } from '../../../../../lib/admin-auth';

const Schema = z.object({ provider_id: z.string().uuid() });

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { db, user } = await requireAdminPermission('can_manage_bookings');
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('id, category_id, status, provider_id')
      .eq('id', params.id)
      .single();
    if (bookingError || !booking) throw new Error('booking_not_found');
    if (!['pending_match', 'unmatched'].includes(booking.status) || booking.provider_id) {
      throw new Error('booking_already_assigned');
    }

    const { data: service, error: serviceError } = await db
      .from('provider_services')
      .select('provider_id, profiles!inner(role, kyc_status, registration_completed)')
      .eq('provider_id', parsed.data.provider_id)
      .eq('category_id', booking.category_id)
      .eq('is_active', true)
      .eq('profiles.role', 'provider')
      .eq('profiles.kyc_status', 'approved')
      .eq('profiles.registration_completed', true)
      .maybeSingle();
    if (serviceError || !service) throw new Error('provider_not_eligible');

    const { data: assigned, error: assignError } = await db
      .from('bookings')
      .update({ provider_id: parsed.data.provider_id })
      .eq('id', params.id)
      .in('status', ['pending_match', 'unmatched'])
      .is('provider_id', null)
      .select('id, customer_id, provider_id, status, matched_at')
      .single();
    if (assignError || !assigned) throw new Error('booking_assignment_conflict');

    const now = new Date().toISOString();
    await Promise.all([
      db
        .from('booking_offers')
        .update({ status: 'expired', responded_at: now })
        .eq('booking_id', params.id)
        .eq('status', 'pending'),
      db.from('audit_log').insert({
        actor_id: user.id,
        action: 'booking.provider_assigned',
        entity_type: 'booking',
        entity_id: params.id,
        new_data: { provider_id: parsed.data.provider_id },
      }),
      db.from('notifications').insert({
        profile_id: parsed.data.provider_id,
        type: 'booking.assigned',
        payload: { booking_id: params.id },
      }),
    ]);

    await appendBookingStatus({
      booking_id: assigned.id,
      customer_id: assigned.customer_id,
      provider_id: assigned.provider_id,
      status: 'assigned',
      actor_id: user.id,
      actor_role: 'admin',
      source: 'admin',
    });

    return NextResponse.json(assigned);
  } catch (error: any) {
    const status =
      error.message === 'unauthorized' ? 401 : error.message === 'forbidden' ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
