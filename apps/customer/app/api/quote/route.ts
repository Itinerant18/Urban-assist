import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { computeNetServicePrice } from '@urban-assist/domain';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  provider_service_id: z.string().uuid(),
  address_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
});

/**
 * Display quote. Same math as createBooking (shared computeNetServicePrice), so
 * the "Pay £X" button always matches the Stripe intent amount. Promo/VAT stay
 * client-side via quote() on top of net_pence — identical to the server path.
 */
export async function POST(req: Request) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { basePence, netPence } = await computeNetServicePrice(createServiceRole(), {
      providerServiceId: parsed.data.provider_service_id,
      addressId: parsed.data.address_id,
      scheduledAt: parsed.data.scheduled_at,
      ownerId: user.id,
    });
    return NextResponse.json({ base_pence: basePence, net_pence: netPence });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
