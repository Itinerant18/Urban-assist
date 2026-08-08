// Node runtime Sentry init, loaded from instrumentation.ts.
import * as Sentry from '@sentry/nextjs';
import {
  scrubSentryEvent,
  sentrySampleRate,
  SENTRY_IGNORE_ERRORS,
} from '@urban-assist/utils/sentry-scrub';

// Server-side DSN is intentionally a separate variable from NEXT_PUBLIC_SENTRY_DSN so a
// deployment can report server errors without shipping a DSN to the browser. Falls back to
// the public one when only that is set.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,

    tracesSampleRate: sentrySampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),

    sendDefaultPii: false,
    ignoreErrors: SENTRY_IGNORE_ERRORS,

    beforeSend: (event) => scrubSentryEvent(event),
    beforeSendTransaction: (event) => scrubSentryEvent(event),
  });

  Sentry.setTag('app', 'customer');
}
