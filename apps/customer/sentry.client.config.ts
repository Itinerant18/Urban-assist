// Browser-side Sentry init. Loaded automatically by @sentry/nextjs.
//
// Next 14 still uses sentry.client.config.ts (instrumentation-client.ts is Next 15.3+).
import * as Sentry from '@sentry/nextjs';
import {
  scrubSentryEvent,
  sentrySampleRate,
  SENTRY_DENY_URLS,
  SENTRY_IGNORE_ERRORS,
} from '@urban-assist/utils/sentry-scrub';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// No DSN means Sentry is simply off — init() with an empty DSN is a no-op, so local dev and
// any environment that has not been given a DSN behave exactly as before.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Sampled rather than 1.0: this is a customer-facing app and traces are billed.
    tracesSampleRate: sentrySampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),

    // Never let the SDK volunteer IPs, cookies or request bodies. scrubSentryEvent then
    // removes what this app itself puts into events.
    sendDefaultPii: false,

    ignoreErrors: SENTRY_IGNORE_ERRORS,
    denyUrls: SENTRY_DENY_URLS,

    beforeSend: (event) => scrubSentryEvent(event),
    beforeSendTransaction: (event) => scrubSentryEvent(event),

    // Session Replay is deliberately not enabled. It records the DOM, which on these apps
    // means addresses, phone numbers and KYC documents — the scrubber cannot reach into a
    // replay recording.
  });

  Sentry.setTag('app', 'customer');
}
