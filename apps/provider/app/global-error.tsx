'use client';
// Catches failures in the root layout itself, which app/error.tsx cannot: at that point
// there is no layout left, so this component has to render its own <html>/<body>.
//
// Deliberately plain markup — no design-system imports. If the root layout blew up, the
// providers and global stylesheet it mounts may be exactly what failed, so anything
// depending on them is unsafe here.
import * as React from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#faf9f7',
          color: '#1a1a1a',
        }}
      >
        <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.25rem', lineHeight: 1.5, color: '#5c5c5c' }}>
            We could not load the app. Nothing you have booked or been paid is affected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: 'pointer',
              borderRadius: '0.75rem',
              border: '1px solid #1a1a1a',
              background: '#1a1a1a',
              color: '#fff',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
