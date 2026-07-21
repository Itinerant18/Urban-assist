import { BarChart3, PoundSterling, TrendingUp, Users, Star } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { BentoGrid, StatTile, PageHeader, SectionHeader } from '@/components/bento';

export const dynamic = 'force-dynamic';

const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(pence / 100);

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

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Marketplace KPIs across all bookings."
        action={<BarChart3 className="h-5 w-5 text-muted" aria-hidden />}
      />

      <SectionHeader title="Revenue" className="mb-3" />
      <BentoGrid className="mb-6">
        <StatTile
          accent
          label="GMV (completed)"
          value={gbp(a.gmv_pence ?? 0)}
          icon={PoundSterling}
          className="col-span-2 md:col-span-3 lg:col-span-4"
        />
        <StatTile
          label="GMV last 30d"
          value={gbp(a.gmv_30d_pence ?? 0)}
          icon={TrendingUp}
          className="col-span-1 md:col-span-3 lg:col-span-4"
        />
        <StatTile
          label="Refunds"
          value={gbp(a.refunds_pence ?? 0)}
          deltaTone="danger"
          className="col-span-1 md:col-span-3 lg:col-span-4"
        />
      </BentoGrid>

      <SectionHeader title="Volume" className="mb-3" />
      <BentoGrid className="mb-6">
        <StatTile
          label="Completion rate"
          value={`${completionRate}%`}
          sub={`${a.completed ?? 0} of ${a.total_bookings ?? 0}`}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Bookings"
          value={String(a.total_bookings ?? 0)}
          sub={`${a.bookings_30d ?? 0} in last 30d`}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Active now"
          value={String(a.active ?? 0)}
          sub={`${a.disputed ?? 0} disputed`}
          deltaTone={(a.disputed ?? 0) > 0 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
        <StatTile
          label="Cancelled"
          value={String(a.cancelled ?? 0)}
          className="col-span-1 md:col-span-2 lg:col-span-3"
        />
      </BentoGrid>

      <SectionHeader title="Quality & people" className="mb-3" />
      <BentoGrid>
        <StatTile
          label="Customers"
          value={String(a.customers ?? 0)}
          icon={Users}
          className="col-span-1 md:col-span-2 lg:col-span-4"
        />
        <StatTile
          label="Providers"
          value={String(a.providers ?? 0)}
          sub={`${a.providers_approved ?? 0} approved`}
          icon={Users}
          className="col-span-1 md:col-span-2 lg:col-span-4"
        />
        <StatTile
          label="Avg provider rating"
          value={a.avg_provider_rating != null ? `★ ${a.avg_provider_rating}` : '—'}
          icon={Star}
          className="col-span-2 md:col-span-2 lg:col-span-4"
        />
      </BentoGrid>
    </div>
  );
}
