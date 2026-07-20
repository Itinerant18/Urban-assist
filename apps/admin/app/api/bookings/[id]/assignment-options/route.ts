import { NextResponse } from 'next/server';
import { requireAdminPermission } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await requireAdminPermission('can_manage_bookings');
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('category_id, status, provider_id')
      .eq('id', params.id)
      .single();
    if (bookingError || !booking) throw new Error('booking_not_found');
    if (!['pending_match', 'unmatched'].includes(booking.status) || booking.provider_id) {
      return NextResponse.json({ providers: [] });
    }

    const { data, error } = await db
      .from('provider_services')
      .select(
        'provider_id, profiles!inner(id, full_name, email, rating_avg, is_online, kyc_status, registration_completed)',
      )
      .eq('category_id', booking.category_id)
      .eq('is_active', true)
      .eq('profiles.role', 'provider')
      .eq('profiles.kyc_status', 'approved')
      .eq('profiles.registration_completed', true)
      .order('provider_id');
    if (error) throw error;

    const providers = Array.from(
      new Map(
        (data ?? []).map((row: any) => [row.provider_id, { ...row.profiles, id: row.provider_id }]),
      ).values(),
    );
    return NextResponse.json({ providers });
  } catch (error: any) {
    const status =
      error.message === 'unauthorized' ? 401 : error.message === 'forbidden' ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
