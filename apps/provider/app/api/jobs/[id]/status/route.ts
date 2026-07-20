import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { updateJobStatus } from '@urban-assist/domain';
import { otpRateLimit } from '@urban-assist/integrations/redis';

const Schema = z.object({
  status: z.enum(['on_the_way', 'arrived', 'in_progress', 'cancelled']),
  cancellation_reason: z.string().max(200).optional().nullable(),
  start_code: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'status_update_failed';
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const {
    data: { user },
  } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const admin = createServiceRole();
    if (parsed.data.status === 'in_progress') {
      if (!parsed.data.start_code) throw new Error('start_code_required');
      const { data: booking } = await admin
        .from('bookings')
        .select('provider_id, status')
        .eq('id', params.id)
        .single();
      if (!booking) throw new Error('booking_not_found');
      if (booking.provider_id !== user.id) throw new Error('forbidden');
      if (booking.status !== 'arrived') throw new Error('invalid_status_transition');

      const limiter = otpRateLimit();
      if (limiter) {
        const { success } = await limiter.limit(`job-start:${user.id}:${params.id}`);
        if (!success) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
      }
      const { data: verification, error: verificationError } = await admin.rpc(
        'verify_booking_start_code',
        {
          p_booking_id: params.id,
          p_provider_id: user.id,
          p_code: parsed.data.start_code,
        },
      );
      if (verificationError) throw new Error('start_code_verification_failed');
      if (verification !== 'verified') throw new Error(String(verification ?? 'invalid_start_code'));
    }

    const data = await updateJobStatus(admin, {
      bookingId: params.id,
      providerId: user.id,
      status: parsed.data.status,
      cancellationReason: parsed.data.cancellation_reason,
    });
    if (data?.customer_id) {
      await admin.from('notifications').insert({
        profile_id: data.customer_id,
        type: 'booking.status_changed',
        payload: { booking_id: params.id, status: parsed.data.status },
      });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = errorMessage(error);
    const status = message === 'forbidden' ? 403 : message === 'booking_not_found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
