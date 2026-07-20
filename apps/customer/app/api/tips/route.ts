import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createTipIntent } from '@urban-assist/integrations/stripe';

const Schema = z.object({
  booking_id: z.string().uuid(),
  amount_pence: z.number().int().min(100), // min £1
});

export async function POST(req: NextRequest) {
  try {
    const db = getSupabaseServer();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { booking_id, amount_pence } = parsed.data;

    // Fetch booking and provider's stripe account id
    const { data: booking, error: bookingErr } = await db
      .from('bookings')
      .select('id, customer_id, provider:profiles!bookings_provider_id_fkey(stripe_account_id)')
      .eq('id', booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const providerStripeAccountId = (booking.provider as any)?.stripe_account_id;
    if (!providerStripeAccountId) {
      return NextResponse.json({ error: 'provider_not_setup_for_payouts' }, { status: 400 });
    }

    // Create the Connect-routed tip payment intent
    const intent = await createTipIntent({
      bookingId: booking.id,
      customerId: user.id,
      providerStripeAccountId,
      amountPence: amount_pence,
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
