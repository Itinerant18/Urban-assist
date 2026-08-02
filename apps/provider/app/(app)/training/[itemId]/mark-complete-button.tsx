'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@urban-assist/ui';

export function MarkCompleteButton({
  itemId,
  initiallyDone,
}: {
  itemId: string;
  initiallyDone: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = React.useState(initiallyDone);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function toggle() {
    const next = !done;
    setBusy(true);
    setError(null);
    setDone(next);
    try {
      const res = await fetch(`/api/training/${itemId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === 'score_required'
            ? 'A quiz score is required for this module.'
            : body.error === 'score_below_pass'
              ? 'Score is below the pass mark.'
              : 'Could not save. Try again.',
        );
      }
      router.refresh();
    } catch (e: any) {
      setDone(!next);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="block"
        className="min-h-12"
        variant={done ? 'outline' : 'primary'}
        disabled={busy}
        onClick={toggle}
      >
        {busy ? 'Saving…' : done ? 'Mark as not done' : 'Mark as complete'}
      </Button>
      {error && <p className="text-center text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
