// Loads the runtime-appropriate Sentry config. Requires
// `experimental.instrumentationHook: true` on Next 14 (the hook is stable from Next 15).
//
// Note: `export const onRequestError = Sentry.captureRequestError` is deliberately absent.
// That hook needs Next 15; on 14 it is never called, so exporting it would only imply
// coverage the framework cannot give. Server Component and route-handler errors are still
// captured through the webpack instrumentation applied by withSentryConfig.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
