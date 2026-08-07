'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { syncDashboardStats } from './actions';

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function handleSync() {
    setBusy(true);
    setErr(null);
    try {
      const res = await syncDashboardStats();
      if (res.ok) {
        router.refresh();
      } else {
        setErr(
          res.reason === 'mfa_required'
            ? 'Re-authenticate to sync'
            : res.reason === 'forbidden'
              ? 'Not permitted'
              : 'Sync failed',
        );
      }
    } catch {
      setErr('Sync failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {err && (
        <span role="status" className="text-xs font-semibold text-danger">
          {err}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-bg/40 transition disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
        <span>{busy ? 'Syncing…' : 'Sync'}</span>
      </button>
    </div>
  );
}
