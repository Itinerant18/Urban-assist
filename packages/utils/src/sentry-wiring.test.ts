import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The Sentry config is duplicated across three apps (Next requires these files at each app
// root). Duplication means it can silently drift, and the failure mode is a report that
// still arrives but now carries a customer's address or a Stripe secret. These assertions
// are cheap and catch exactly that: a config that stops scrubbing, or a fourth app added
// without it.
//
// Vitest runs from the repo root, so these paths are relative to that.
const APPS = ['customer', 'provider', 'admin'] as const;
const RUNTIMES = ['client', 'server', 'edge'] as const;

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Sentry wiring', () => {
  for (const app of APPS) {
    for (const runtime of RUNTIMES) {
      const file = `apps/${app}/sentry.${runtime}.config.ts`;

      it(`${app}/${runtime}: scrubs events and suppresses default PII`, () => {
        const src = read(file);
        expect(src, `${file} must import the shared scrubber`).toContain(
          '@urban-assist/utils/sentry-scrub',
        );
        expect(src, `${file} must scrub errors`).toMatch(/beforeSend:\s*\(event\)\s*=>\s*scrubSentryEvent/);
        expect(src, `${file} must scrub transactions`).toMatch(
          /beforeSendTransaction:\s*\(event\)\s*=>\s*scrubSentryEvent/,
        );
        expect(src, `${file} must not let the SDK volunteer PII`).toContain('sendDefaultPii: false');
        // Standalone spans (web vitals) never pass through beforeSend, so they need their
        // own hook or they bypass scrubbing entirely.
        expect(src, `${file} must scrub standalone spans`).toMatch(
          /beforeSendSpan:\s*\(span\)\s*=>\s*scrubSentrySpan/,
        );
      });

      it(`${app}/${runtime}: stays inert without a DSN`, () => {
        // Guards the "local dev is unaffected" property: init must be behind a DSN check.
        expect(read(file)).toMatch(/if \(dsn\) \{/);
      });
    }

    it(`${app}: does not enable Session Replay`, () => {
      // Replay records the DOM, which on these apps means addresses, phone numbers and KYC
      // documents. beforeSend cannot reach into a replay recording.
      const src = read(`apps/${app}/sentry.client.config.ts`);
      expect(src).not.toMatch(/replaysSessionSampleRate|replaysOnErrorSampleRate|replayIntegration/);
    });

    it(`${app}: the Sentry tunnel is reachable without a session and pinned`, () => {
      // The browser posts envelopes to /api/monitoring. The provider and admin middleware
      // protect everything except /login, so a tunnel outside /api would be redirected and
      // client-side errors would silently never arrive - /api is already excluded.
      expect(read(`apps/${app}/sentry.client.config.ts`)).toContain("tunnel: '/api/monitoring'");
      expect(read(`apps/${app}/middleware.ts`)).toContain('(?!api|');

      // The SDK's own tunnelRoute takes org/project from the request's query params, making
      // the origin a relay into any Sentry tenant. Our route pins the destination instead,
      // and rate-limits on a trusted IP.
      expect(read(`apps/${app}/next.config.js`)).not.toMatch(/^\s*tunnelRoute:/m);
      const route = read(`apps/${app}/app/api/monitoring/route.ts`);
      expect(route).toContain('CONFIGURED_DSN');
      expect(route, 'tunnel must be rate limited').toContain('sentryTunnelRateLimit');
      expect(route, 'tunnel must key on a trusted IP').toContain('rateLimitKey');
    });

    it(`${app}: error boundary reports to Sentry`, () => {
      // A boundary swallows the error, so a boundary that does not capture is a blind spot.
      expect(read(`apps/${app}/app/global-error.tsx`)).toContain('Sentry.captureException');
    });
  }
});
