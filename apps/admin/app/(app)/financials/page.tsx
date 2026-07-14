import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { FinancialsClient } from './financials-client';

export const dynamic = 'force-dynamic';

export default async function FinancialsPage() {
  const db = getSupabaseServer();

  // 1. Authenticate user
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Query permissions
  const { data: perms } = await db
    .from('admin_permissions')
    .select('can_manage_payments')
    .eq('profile_id', user.id)
    .single();

  if (!perms || !perms.can_manage_payments) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <h2 className="font-display text-xl font-bold text-ink">Access Denied</h2>
        <p className="text-sm text-muted text-center max-w-sm">
          You do not have the required <code>can_manage_payments</code> permission to access this page.
        </p>
      </div>
    );
  }

  // 3. Fetch pending payouts
  const { data: pendingPayouts } = await db
    .from('payouts')
    .select('provider_id, amount_pence, profiles(full_name, stripe_account_id)')
    .eq('status', 'pending');

  // Compute grouped provider balances and total pending amount
  const balancesMap: Record<string, { providerId: string; fullName: string; stripeAccountId: string | null; balancePence: number }> = {};
  let pendingPayoutsTotal = 0;

  for (const p of pendingPayouts ?? []) {
    pendingPayoutsTotal += p.amount_pence;
    const providerId = p.provider_id;
    const profile = p.profiles as any;
    const fullName = profile?.full_name ?? 'Unnamed Provider';
    const stripeAccountId = profile?.stripe_account_id ?? null;

    if (!balancesMap[providerId]) {
      balancesMap[providerId] = {
        providerId,
        fullName,
        stripeAccountId,
        balancePence: 0,
      };
    }
    balancesMap[providerId].balancePence += p.amount_pence;
  }

  const balancesList = Object.values(balancesMap).sort((a, b) => b.balancePence - a.balancePence);

  // 4. Fetch platform revenue (20% fee on succeeded payments)
  const { data: succeededPayments } = await db
    .from('payments')
    .select('amount_pence')
    .eq('status', 'succeeded');

  const platformRevenueTotal = Math.round(
    (succeededPayments ?? []).reduce((sum, p) => sum + (p.amount_pence ?? 0), 0) * 0.20
  );

  // 5. Fetch failed payouts total
  const { data: failedPayouts } = await db
    .from('payouts')
    .select('amount_pence')
    .eq('status', 'failed');

  const failedPayoutsTotal = (failedPayouts ?? []).reduce((sum, p) => sum + (p.amount_pence ?? 0), 0);

  return (
    <FinancialsClient
      pendingPayoutsTotal={pendingPayoutsTotal}
      platformRevenueTotal={platformRevenueTotal}
      failedPayoutsTotal={failedPayoutsTotal}
      balances={balancesList}
    />
  );
}
