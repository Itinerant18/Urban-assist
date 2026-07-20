import type { AdminFinancialDashboard } from '@urban-assist/types';
import { redirect } from 'next/navigation';
import { requireAdminPermission } from '../../../lib/admin-auth';
import { FinancialsClient } from './financials-client';

export const dynamic = 'force-dynamic';

export default async function FinancialsPage() {
  try {
    const { db } = await requireAdminPermission('can_manage_payments');
    const { data, error } = await db.rpc('get_admin_financial_dashboard');
    if (error) throw error;

    return <FinancialsClient dashboard={data as unknown as AdminFinancialDashboard} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'financial_dashboard_failed';
    if (message === 'unauthorized') redirect('/login');

    if (message === 'forbidden') {
      return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <h2 className="font-display text-xl font-bold text-ink">Access denied</h2>
          <p className="max-w-sm text-center text-sm text-muted">
            You need payment-management permission to view the financial ledger.
          </p>
        </div>
      );
    }

    throw error;
  }
}
