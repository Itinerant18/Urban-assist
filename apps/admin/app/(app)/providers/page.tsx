import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
import {
  PageHeader,
  TableTile,
  StatusChip,
  statusToneFrom,
  BentoEmpty,
} from '@/components/bento';

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
      <PageHeader
        title="Providers"
        subtitle={`${count} registered · ${onlineCount} online now.`}
      />

      {providers.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={Users} message="No providers registered yet." />
        </TableTile>
      ) : (
        <TableTile>
          {providers.map((p: ProviderSummary) => (
            <Link
              key={p.id}
              href={`/providers/${p.id}`}
              className="flex items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink text-sm truncate">{p.full_name ?? 'Unnamed'}</p>
                <p className="text-xs text-muted font-mono truncate">{p.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <StatusChip tone={statusToneFrom(p.kyc_status)}>{p.kyc_status}</StatusChip>
                {p.is_online ? <StatusChip tone="success">Online</StatusChip> : null}
                {p.is_blocked ? <StatusChip tone="danger">Blocked</StatusChip> : null}
                <span className="text-xs text-muted font-mono">
                  ★ {Number(p.rating_avg ?? 0).toFixed(1)}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
            </Link>
          ))}
        </TableTile>
      )}
    </div>
  );
}
