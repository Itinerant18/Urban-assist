import { NextResponse } from 'next/server';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { loadCommissionRates, splitCommission } from '../../../../lib/provider-data';

export const dynamic = 'force-dynamic';

/**
 * Commission-net payout balance. The earnings page previously showed gross card
 * takings minus net payouts — overstated by the commission on every job.
 * Commission rules are service-role-only, so the net must be computed here.
 */
export async function GET() {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createServiceRole();
  const [{ data: bookings }, rateFor, { data: payouts }] = await Promise.all([
    admin
      .from('bookings')
      .select('price_pence, category_id')
      .eq('provider_id', user.id)
      .eq('status', 'completed')
      .eq('payment_method', 'card'),
    loadCommissionRates(admin),
    admin.from('payouts').select('amount_pence, status').eq('provider_id', user.id),
  ]);

  const netEarnings = (bookings ?? []).reduce(
    (sum, b) => sum + splitCommission(b.price_pence, rateFor(b.category_id)).net,
    0,
  );
  const paidOut = (payouts ?? [])
    .filter((po) => po.status === 'paid')
    .reduce((sum, po) => sum + po.amount_pence, 0);

  return NextResponse.json({ balance_pence: Math.max(0, netEarnings - paidOut) });
}
