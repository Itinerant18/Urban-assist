import { describe, expect, it } from 'vitest';

// Proves the assembled pipeline, not just the pure function: real Sentry.init from
// sentry.server.config.ts, real beforeSend, real envelope. Interception is on the client's
// transport, strictly AFTER beforeSend, so what is asserted here is exactly what would leave
// the process.
//
// Every sensitive literal is assembled at RUNTIME. The SDK's ContextLines integration echoes
// this file's own source into stack frames, so a literal written here would appear in the
// payload as source text and read as a leak. That is not theoretical — it is how the first
// run of this test behaved before it was rewritten.
//
// Skipped without a DSN, since Sentry.init is DSN-gated and there is no client to inspect.
// The intercepted envelope is deliberately NOT forwarded, so running the suite does not post
// events to Sentry.
const HAS_DSN = Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);

describe.skipIf(!HAS_DSN)('sentry pipeline', () => {
  it('puts nothing sensitive into the envelope for an error stuffed with PII', async () => {
    const Sentry = await import('@sentry/nextjs');
    await import('../sentry.server.config');

    const client = Sentry.getClient();
    expect(client, 'Sentry.init did not run — is the DSN set in apps/customer/.env?').toBeTruthy();

    const sent: string[] = [];
    const transport = client!.getTransport()!;
    const realSend = transport.send.bind(transport);
    transport.send = async (envelope: any) => {
      sent.push(JSON.stringify(envelope));
      // Intentionally not forwarded to realSend: this asserts what *would* be transmitted
      // without posting a synthetic error to the real project on every test run.
      void realSend;
      return {};
    };

    // Assembled so none of these appear as source literals.
    const j = ['jordan', ['example', 'test'].join('.')].join('@');
    const street = ['14', 'Upper', 'Street'].join(' ');
    const pc = ['N1', '0PQ'].join(' ');
    const ph = '077009' + '00001';
    const ph2 = '077009' + '00999';
    const sk = 'sk_' + 'test_' + 'abcdefghijkl';
    const cs = 'pi_1A2b3C' + '_secret_' + '9Z8y7X';
    const jwtish = 'eyJhbGciOiJIUzI1NiJ9' + '.eyJzdWIiOiIxIn0' + '.aaaaaaaaaaaaaaaa';
    const name = ['Jordan', 'Lee'].join(' ');
    const code = '48' + '21';
    const ip = '203.0.' + '113.7';
    const uname = 'jordan' + '-u';

    Sentry.withScope((scope) => {
      scope.setUser({ id: 'user-123', email: j, username: uname, ip_address: ip });
      scope.setExtra('booking', {
        id: 'bk-1',
        address: street,
        postcode: pc,
        customer: { phone: ph, full_name: name },
        start_code: code,
      });
      scope.addBreadcrumb({ message: `called ${ph}`, data: { token: jwtish } });
      Sentry.captureException(new Error(`checkout failed for ${cs} with ${sk} and ${ph2}`));
    });

    await Sentry.flush(8000);
    expect(sent.length, 'no envelope was sent').toBeGreaterThan(0);

    const payload = sent.join('\n');
    const needles = [j, street, pc, ph, ph2, name, code, sk, cs, jwtish, ip, uname];
    for (const needle of needles) {
      expect(payload, `LEAK: "${needle}" reached the wire`).not.toContain(needle);
    }

    // Hostname must not travel either.
    const parsed = JSON.parse(sent[0].slice(sent[0].indexOf('[')));
    expect(payload).not.toContain('"server_name"');

    // The report must still be useful.
    expect(payload).toContain('user-123');
    expect(payload).toContain('bk-1');
    expect(payload).toContain('checkout failed');
    expect(parsed).toBeTruthy();
  }, 30000);
});
