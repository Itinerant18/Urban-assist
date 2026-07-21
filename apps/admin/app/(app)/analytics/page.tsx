import { BarChart3 } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(
    pence / 100,
  );

type Analytics = {
  total_bookings: number;
  completed: number;
  cancelled: number;
  active: number;
  disputed: number;
  gmv_pence: number;
  bookings_30d: number;
  gmv_30d_pence: number;
  refunds_pence: number;
  customers: number;
  providers: number;
  providers_approved: number;
  avg_provider_rating: number | null;
};

export default async function AnalyticsPage() {
  const { db } = await requireAdminPermission('can_view_audit_log');
  const { data } = await (db as any).rpc('get_admin_analytics');
  const a = (data ?? {}) as Partial<Analytics>;

  const completionRate = a.total_bookings
    ? Math.round(((a.completed ?? 0) / a.total_bookings) * 100)
    : 0;

  const tiles: [string, string, string?][] = [
    ['GMV (completed)', gbp(a.gmv_pence ?? 0)],
    ['GMV last 30d', gbp(a.gmv_30d_pence ?? 0)],
    ['Refunds', gbp(a.refunds_pence ?? 0)],
    ['Completion rate', `${completionRate}%`, `${a.completed ?? 0} of ${a.total_bookings ?? 0}`],
    ['Bookings', String(a.total_bookings ?? 0), `${a.bookings_30d ?? 0} in last 30d`],
    ['Active now', String(a.active ?? 0), `${a.disputed ?? 0} disputed`],
    ['Cancelled', String(a.cancelled ?? 0)],
    ['Customers', String(a.customers ?? 0)],
    ['Providers', String(a.providers ?? 0), `${a.providers_approved ?? 0} approved`],
    ['Avg provider rating', a.avg_provider_rating != null ? `★ ${a.avg_provider_rating}` : '—'],
  ];

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-muted" />
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Analytics</h1>
          <p className="text-sm text-muted mt-1">Marketplace KPIs across all bookings.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="card">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-xl font-semibold text-ink mt-1">{value}</p>
            {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
