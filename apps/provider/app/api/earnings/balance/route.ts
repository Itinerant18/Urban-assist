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
      .select('id, price_pence, category_id, payment_method')
      .eq('provider_id', user.id)
      .eq('status', 'completed'),
    loadCommissionRates(admin),
    admin.from('payouts').select('amount_pence, status').eq('provider_id', user.id),
  ]);

  // Per-booking commission split for the earnings list (cash included — the
  // provider keeps the net either way; cash just never enters the balance).
  const splits: Record<string, { net_pence: number; commission_pence: number; bps: number }> = {};
  let netCardEarnings = 0;
  for (const b of bookings ?? []) {
    const split = splitCommission(b.price_pence, rateFor(b.category_id));
    splits[b.id] = { net_pence: split.net, commission_pence: split.commission, bps: split.bps };
    if (b.payment_method === 'card') netCardEarnings += split.net;
  }

  const paidOut = (payouts ?? [])
    .filter((po) => po.status === 'paid')
    .reduce((sum, po) => sum + po.amount_pence, 0);

  return NextResponse.json({
    balance_pence: Math.max(0, netCardEarnings - paidOut),
    splits,
  });
}
