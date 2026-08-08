// Edge runtime Sentry init, loaded from instrumentation.ts. This covers middleware, which
// is where the Supabase session refresh and the auth gates run.
import * as Sentry from '@sentry/nextjs';
import {
  scrubSentryEvent,
  scrubSentrySpan,
  sentrySampleRate,
  SENTRY_IGNORE_ERRORS,
} from '@urban-assist/utils/sentry-scrub';

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
    beforeSendSpan: (span) => scrubSentrySpan(span),
  });

  Sentry.setTag('app', 'admin');
}
