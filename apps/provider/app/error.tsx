'use client';
// An error boundary, not an empty state: a failed load must never be presented
// as "there is nothing here".
import { ErrorState } from '@urban-assist/ui';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <ErrorState
          title="Something went wrong"
          description="We could not load this. Nothing you have booked or been paid is affected."
          onRetry={reset}
        />
      </div>
    </main>
  );
}
