// Loads the runtime-appropriate Sentry config. Requires
// `experimental.instrumentationHook: true` on Next 14 (the hook is stable from Next 15).
//
// Note: `export const onRequestError = Sentry.captureRequestError` is deliberately absent.
// That hook needs Next 15; on 14 it is never called, so exporting it would only imply
// coverage the framework cannot give.
//
// withSentryConfig's webpack instrumentation still covers API routes, route handlers,
// middleware, and server components matching page|layout|loading|head|not-found, plus
// generateMetadata. What it does NOT cover, and what onRequestError would have, is
// `'use server'` action bodies — so a throw inside a Server Action is invisible unless the
// action captures it itself. The admin app is where that matters: every admin mutation is a
// Server Action. Capture explicitly there until this project moves to Next 15.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
