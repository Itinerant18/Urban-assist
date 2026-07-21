import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

type ProviderSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_online: boolean;
  is_blocked: boolean;
  kyc_status: 'pending' | 'approved' | 'rejected';
  rating_avg: number | null;
};

export default async function ProvidersPage() {
  const { db } = await requireAdminPermission('can_manage_providers');
  const { data } = await (db as any)
    .from('profiles')
    .select('id, full_name, email, is_online, is_blocked, kyc_status, rating_avg, created_at')
    .eq('role', 'provider')
    .order('created_at', { ascending: false })
    .limit(50);
  const providers = (data ?? []) as ProviderSummary[];

  const count = providers.length;
  const onlineCount = providers.filter((provider) => provider.is_online).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Providers</h1>
        <p className="text-sm text-muted mt-1">
          {count} registered · {onlineCount} online now.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <Users className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No providers registered yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {providers.map((p: ProviderSummary) => (
            <Link
              key={p.id}
              href={`/providers/${p.id}`}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-ink text-sm">
                    {p.full_name ?? 'Unnamed'}
                  </p>
                  <p className="text-xs text-muted">{p.email}</p>
                </div>
                <span
                  className={`text-xs font-mono-utility px-2 py-0.5 rounded-full ${
                    p.kyc_status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : p.kyc_status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {p.kyc_status}
                </span>
                {p.is_online && (
                  <span className="text-xs text-green-600 font-medium">Online</span>
                )}
                {p.is_blocked && <span className="text-xs font-semibold text-danger">Blocked</span>}
                <span className="text-xs text-muted">★ {Number(p.rating_avg ?? 0).toFixed(1)}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
