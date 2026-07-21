import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import {
  PageHeader,
  TableTile,
  StatusChip,
  BentoEmpty,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

export default async function KYCQueuePage() {
  const db = getSupabaseServer();
  const { data: pending } = await db
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'provider')
    .eq('kyc_status', 'pending')
    .order('created_at', { ascending: false });

  const count = pending?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="KYC Review Queue"
        subtitle={`${count} provider${count !== 1 ? 's' : ''} pending verification.`}
        action={<ShieldCheck className="h-5 w-5 text-muted" aria-hidden />}
      />

      {!pending || pending.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={ShieldCheck} message="All clear — no pending KYC reviews." />
        </TableTile>
      ) : (
        <TableTile>
          {pending.map((p) => (
            <Link
              href={`/kyc/${p.id}`}
              key={p.id}
              className="flex items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink text-sm truncate">{p.full_name ?? 'Unnamed'}</p>
                <p className="text-xs text-muted font-mono truncate">{p.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusChip tone="accent">Awaiting review</StatusChip>
                <ChevronRight className="h-4 w-4 text-muted shrink-0" aria-hidden />
              </div>
            </Link>
          ))}
        </TableTile>
      )}
    </div>
  );
}

