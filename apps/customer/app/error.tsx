'use client';
// An error boundary, not an empty state: a failed load must never be presented
// as "there is nothing here".
import * as React from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorState } from '@urban-assist/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // A boundary swallows the error, so without this the whole class of client render
  // failures would never reach Sentry.
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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
