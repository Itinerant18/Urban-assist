import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { createBooking } from '@urban-assist/domain';
import { bookingCreateRateLimit } from '@urban-assist/integrations/redis';

const Schema = z.object({
  provider_service_id: z.string().uuid(),
  address_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  payment_method: z.enum(['card', 'cash']),
  promo_code: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await getSupabaseServer().auth.getUser();
  if (!user.data.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = bookingCreateRateLimit();
  if (rl) {
    const { success } = await rl.limit(user.data.user.id);
    if (!success) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  try {
    const result = await createBooking(getSupabaseServer(), createServiceRole(), {
      customerId: user.data.user.id,
      providerServiceId: body.provider_service_id,
      addressId: body.address_id,
      scheduledAt: body.scheduled_at,
      paymentMethod: body.payment_method,
      promoCode: body.promo_code,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 400 });
  }
}
