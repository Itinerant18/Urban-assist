'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleSync() {
    setBusy(true);
    try {
      const res = await fetch('/api/cron/aggregate', { method: 'POST' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Sync failed');
      }
    } catch (e) {
      alert('Error: ' + e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-bg/40 transition disabled:opacity-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
      <span>{busy ? 'Syncing…' : 'Sync'}</span>
    </button>
  );
}
