import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ShieldCheck, ChevronRight } from 'lucide-react';

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
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">KYC Review Queue</h1>
        <p className="text-sm text-muted mt-1">
          {count} provider{count !== 1 ? 's' : ''} pending verification.
        </p>
      </div>

      {!pending || pending.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <ShieldCheck className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">All clear — no pending KYC reviews.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((p) => (
            <Link
              href={`/kyc/${p.id}`}
              key={p.id}
              className="card flex items-center justify-between hover:bg-bg/40 transition cursor-pointer"
            >
              <div>
                <p className="font-medium text-ink text-sm">{p.full_name ?? 'Unnamed'}</p>
                <p className="text-xs text-muted">{p.email}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
