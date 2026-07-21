import { NextResponse } from 'next/server';
import { requireAdminPermission } from '../../../../../lib/admin-auth';

import { AssignmentEngine, resolveAssignmentStrategy } from '../../../../../lib/assignment-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { db, user, roles } = await requireAdminPermission('can_manage_bookings');
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .select('category_id, status, provider_id')
      .eq('id', params.id)
      .single();
    if (bookingError || !booking) throw new Error('booking_not_found');
    if (['completed', 'in_progress'].includes(booking.status)) {
      return NextResponse.json({ providers: [] });
    }

    const requestedStrategy = new URL(req.url).searchParams.get('strategy') ?? 'manual_admin';
    if (!['manual_admin', 'ml_recommendation'].includes(requestedStrategy)) {
      return NextResponse.json({ error: 'invalid_assignment_strategy' }, { status: 400 });
    }
    const strategy = resolveAssignmentStrategy(requestedStrategy as 'manual_admin' | 'ml_recommendation');
    const engine = new AssignmentEngine(
      db as any,
      { id: user.id, roles },
      strategy,
      async () => null,
    );
    const providers = await engine.getCandidates(params.id);

    return NextResponse.json({ providers });
  } catch (error: any) {
    const status =
      error.message === 'unauthorized' ? 401 : error.message === 'forbidden' ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
