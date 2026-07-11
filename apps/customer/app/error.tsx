'use client';
import { Button, EmptyState } from '@urban-assist/ui';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-6">
      <EmptyState
        title="Something went wrong"
        description="An unexpected error occurred. Try again, or come back in a moment."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  );
}
