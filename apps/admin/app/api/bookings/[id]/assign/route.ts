import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendBookingStatus, sendPush } from '@urban-assist/integrations/firebase';
import { requireAdminPermission } from '../../../../../lib/admin-auth';

import { AssignmentEngine, resolveAssignmentStrategy } from '../../../../../lib/assignment-engine';
import { getRequestContext } from '../../../../../lib/request-context';

const Schema = z.object({
  provider_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(500).optional(),
  generate_otp: z.boolean().optional(),
  strategy: z.enum(['manual_admin', 'ml_recommendation']).default('manual_admin'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { db, user, roles } = await requireAdminPermission('can_manage_bookings');
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const strategy = resolveAssignmentStrategy(parsed.data.strategy);
    const requestContext = getRequestContext(req);
    const engine = new AssignmentEngine(
      db as any,
      { id: user.id, roles },
      strategy,
      appendBookingStatus,
      (result) =>
        sendPush(db as any, result.provider_id, {
          title: result.action_type === 'REASSIGN_PROVIDER' ? 'Booking reassigned' : 'New booking',
          body: 'Open Urban Assist Provider to review the booking details.',
          data: {
            booking_id: result.booking_id,
            link: `/bookings/${result.booking_id}`,
          },
        }),
    );
    const assigned = await engine.assign({
      bookingId: params.id,
      providerId: parsed.data.provider_id,
      reason: parsed.data.reason,
      generateOtp: parsed.data.generate_otp,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return NextResponse.json(assigned);
  } catch (error: any) {
    const message = String(error?.message ?? 'assignment_failed');
    const status = message === 'unauthorized'
      ? 401
      : message === 'mfa_required'
        ? 403
      : message.includes('forbidden')
        ? 403
        : message.includes('already') || message.includes('not_assignable')
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
