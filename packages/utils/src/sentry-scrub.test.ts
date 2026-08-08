import { describe, expect, it } from 'vitest';
import { scrubSentryEvent, scrubString, sentrySampleRate } from './sentry-scrub';

describe('sentrySampleRate', () => {
  it('falls back for unset, blank and unparseable values', () => {
    // The blank case is the point: an env var that exists but is empty coerces to 0 under
    // Number(), which silently switches tracing off with no error.
    expect(sentrySampleRate(undefined, 0.1)).toBe(0.1);
    expect(sentrySampleRate('', 0.1)).toBe(0.1);
    expect(sentrySampleRate('   ', 0.1)).toBe(0.1);
    expect(sentrySampleRate('not-a-number', 0.1)).toBe(0.1);
    expect(sentrySampleRate('1.5', 0.1)).toBe(0.1);
    expect(sentrySampleRate('-1', 0.1)).toBe(0.1);
  });

  it('honours a valid rate, including an explicit zero', () => {
    expect(sentrySampleRate('0.25', 0.1)).toBe(0.25);
    expect(sentrySampleRate('1', 0.1)).toBe(1);
    // Explicitly setting 0 is a legitimate way to turn tracing off.
    expect(sentrySampleRate('0', 0.1)).toBe(0);
  });
});

// A leak here is silent: the report still arrives, it just carries a customer's address or
// a Stripe secret with it. So the assertions are all "this value must be absent".
describe('scrubSentryEvent', () => {
  it('drops cookies, request body and query string', () => {
    const out = scrubSentryEvent({
      request: {
        url: 'https://app.test/bookings?postcode=N1+0PQ&token=abc123',
        cookies: { 'sb-access-token': 'secret' },
        data: { card: '4242424242424242' },
        query_string: 'postcode=N1+0PQ',
        headers: { Authorization: 'Bearer abc', 'X-Trace': 'keep-me' },
      },
    })!;

    expect(out.request.cookies).toBeUndefined();
    expect(out.request.data).toBeUndefined();
    expect(out.request.url).not.toContain('N1');
    expect(out.request.url).not.toContain('abc123');
    expect(out.request.query_string).toBe('[redacted]');
    expect(out.request.headers.Authorization).toBe('[redacted]');
    // Non-sensitive headers survive, otherwise reports lose all debugging value.
    expect(out.request.headers['X-Trace']).toBe('keep-me');
  });

  it('reduces user to an id', () => {
    const out = scrubSentryEvent({
      user: { id: 'u1', email: 'a@b.test', username: 'alice', ip_address: '1.2.3.4' },
    })!;
    expect(out.user).toEqual({ id: 'u1' });
  });

  // Column names taken from packages/db/src/types/generated.ts. An earlier version of this
  // test asserted on a key called `address`, which is not a column in this schema — so it
  // passed while the real `line1`/`city`/`bank_*`/`nino` columns went through unredacted.
  it('redacts the real sensitive columns of this schema, at depth', () => {
    const out = scrubSentryEvent({
      extra: {
        booking: {
          id: 'keep',
          customer: { phone: '07700900001', full_name: 'Jordan Lee', email: 'a@b.test' },
        },
        row1: { id: 'keep2', line1: '14 Upper Street', line2: 'Flat 2', city: 'London', postcode: 'N1 0PQ' },
        row2: {
          id: 'keep3',
          nino: 'QQ123456C',
          bank_sort_code: '04-00-04',
          bank_account_number: '12345678',
          bank_account_holder_name: 'Jordan Lee',
          utr_number: '1234567890',
        },
      },
    })!;
    const b: any = out.extra.booking;
    expect(b.id).toBe('keep');
    expect(b.customer.phone).toBe('[redacted]');
    expect(b.customer.full_name).toBe('[redacted]');
    expect(b.customer.email).toBe('[redacted]');

    // Keys deliberately named row1/row2: a key containing "address" is redacted wholesale
    // (fail-closed), which would hide the per-column assertions below.
    const a: any = out.extra.row1;
    expect(a.id).toBe('keep2');
    for (const k of ['line1', 'line2', 'city', 'postcode']) expect(a[k]).toBe('[redacted]');

    const p: any = out.extra.row2;
    expect(p.id).toBe('keep3');
    for (const k of ['nino', 'bank_sort_code', 'bank_account_number', 'bank_account_holder_name', 'utr_number']) {
      expect(p[k], `${k} must be redacted`).toBe('[redacted]');
    }
  });

  // CRITICAL from review: transaction events carry spans, and http client spans put the raw
  // query string into data['http.query']. beforeSendTransaction did nothing for it.
  it('strips query strings from span data and descriptions', () => {
    const out = scrubSentryEvent({
      spans: [
        {
          description: 'GET https://x.supabase.co/rest/v1/profiles?email=eq.a@b.test',
          data: { 'http.query': '?email=eq.a@b.test', 'http.method': 'GET' },
        },
      ],
    })!;
    const sp: any = out.spans[0];
    expect(sp.description).not.toContain('a@b.test');
    expect(sp.data['http.query']).toBe('[redacted]');
    expect(sp.data['http.method']).toBe('GET');
  });

  // CRITICAL from review: fetch/xhr/navigation breadcrumbs keep full URLs with query
  // strings, and only request.url was being stripped.
  it('strips query strings from breadcrumb URLs', () => {
    const out = scrubSentryEvent({
      breadcrumbs: [
        { category: 'navigation', data: { from: '/browse?q=Jordan+Lee', to: '/coming-soon?postcode=N1+0PQ' } },
        { category: 'fetch', data: { url: 'https://x.test/api?email=a@b.test', 'http.query': '?email=a@b.test' } },
      ],
    })!;
    const nav: any = out.breadcrumbs[0].data;
    expect(nav.from).toBe('/browse?[redacted]');
    expect(nav.to).toBe('/coming-soon?[redacted]');
    const f: any = out.breadcrumbs[1].data;
    expect(f.url).toBe('https://x.test/api?[redacted]');
    expect(f['http.query']).toBe('[redacted]');
  });

  it('strips the Referer header query string', () => {
    const out = scrubSentryEvent({
      request: { headers: { Referer: 'https://app.test/coming-soon?postcode=N1+0PQ', 'X-Trace': 'keep' } },
    })!;
    expect(out.request.headers.Referer).toBe('https://app.test/coming-soon?[redacted]');
    expect(out.request.headers['X-Trace']).toBe('keep');
  });

  it('redacts emails and postcodes in free text', () => {
    const out = scrubSentryEvent({
      message: 'Key (email)=(jordan@example.com) already exists near N1 0PQ',
    })!;
    expect(out.message).not.toContain('jordan@example.com');
    expect(out.message).not.toContain('N1 0PQ');
    expect(out.message).toContain('[email]');
    expect(out.message).toContain('[postcode]');
  });

  it('does not over-redact keys that merely contain a short token', () => {
    const out = scrubSentryEvent({
      extra: { platform: 'web', template: 'x', latency: 12, translated: true, capacity: 3 },
    })!;
    const x: any = out.extra;
    expect(x.platform).toBe('web');
    expect(x.template).toBe('x');
    expect(x.latency).toBe(12);
    expect(x.translated).toBe(true);
    expect(x.capacity).toBe(3);
  });

  it('redacts past the depth limit rather than passing data through', () => {
    let deep: any = { secretish: 'x' };
    const leaf = { line1: '14 Upper Street' };
    deep = { a: { b: { c: { d: { e: { f: { g: leaf } } } } } } };
    const out = scrubSentryEvent({ extra: deep })!;
    expect(JSON.stringify(out.extra)).not.toContain('14 Upper Street');
  });

  it('redacts secrets embedded in free-text messages', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N';
    const out = scrubSentryEvent({
      message: `auth failed for ${jwt} using sk_test_abcdef123456 and pi_1A2b3C_secret_9Z8y7X`,
      exception: { values: [{ value: `phone 07700900123 rejected` }] },
    })!;

    expect(out.message).not.toContain('eyJhbGciOi');
    expect(out.message).toContain('[jwt]');
    expect(out.message).toContain('[stripe-key]');
    expect(out.message).toContain('[stripe-client-secret]');
    expect(out.exception.values[0].value).toBe('phone [phone] rejected');
  });

  it('scrubs breadcrumb messages and data', () => {
    const out = scrubSentryEvent({
      breadcrumbs: [
        { message: 'called 07700900999', data: { start_code: '4821', keep: 'yes' } },
      ],
    })!;
    expect(out.breadcrumbs[0].message).toBe('called [phone]');
    expect(out.breadcrumbs[0].data.start_code).toBe('[redacted]');
    expect(out.breadcrumbs[0].data.keep).toBe('yes');
  });

  // Found by sending a real event through the real config and inspecting the envelope: the
  // SDK's LocalVariablesAsync integration attaches the locals of a crashed frame, and
  // nothing in beforeSend reached them. Unit-testing scrubSentryEvent in isolation had
  // missed this entirely.
  it('redacts local variables captured in stack frames', () => {
    const out = scrubSentryEvent({
      exception: {
        values: [
          {
            value: 'boom',
            stacktrace: {
              frames: [
                {
                  function: 'createBooking',
                  vars: {
                    bookingId: 'keep-me',
                    address: '14 Upper Street',
                    customer: { phone: '07700900001' },
                    clientSecret: 'pi_1A_secret_9Z',
                  },
                },
              ],
            },
          },
        ],
      },
    })!;

    const vars: any = out.exception.values[0].stacktrace.frames[0].vars;
    expect(vars.bookingId).toBe('keep-me');
    expect(vars.address).toBe('[redacted]');
    expect(vars.customer.phone).toBe('[redacted]');
    expect(vars.clientSecret).toBe('[redacted]');
  });

  it('scrubs secrets out of source context lines', () => {
    const out = scrubSentryEvent({
      exception: {
        values: [
          {
            value: 'boom',
            stacktrace: {
              frames: [
                {
                  context_line: "  const key = 'sk_live_aaaaaaaaaaaa';",
                  pre_context: ['  // ring 07700900123'],
                  post_context: ['  done();'],
                },
              ],
            },
          },
        ],
      },
    })!;

    const f: any = out.exception.values[0].stacktrace.frames[0];
    expect(f.context_line).toContain('[stripe-key]');
    expect(f.pre_context[0]).toContain('[phone]');
    expect(f.post_context[0]).toBe('  done();');
  });

  it('drops server_name', () => {
    const out = scrubSentryEvent({ server_name: 'someones-laptop', message: 'x' })!;
    expect(out.server_name).toBeUndefined();
  });

  it('scrubs thread frames too', () => {
    const out = scrubSentryEvent({
      threads: {
        values: [{ stacktrace: { frames: [{ vars: { postcode: 'N1 0PQ', id: 'ok' } }] } }],
      },
    })!;
    const vars: any = out.threads.values[0].stacktrace.frames[0].vars;
    expect(vars.postcode).toBe('[redacted]');
    expect(vars.id).toBe('ok');
  });

  it('survives a cyclic object without hanging', () => {
    const cyclic: any = { name: 'root' };
    cyclic.self = cyclic;
    expect(() => scrubSentryEvent({ extra: { cyclic } })).not.toThrow();
  });

  it('leaves an event with nothing sensitive untouched', () => {
    const out = scrubSentryEvent({ message: 'booking_not_found', tags: { app: 'customer' } })!;
    expect(out.message).toBe('booking_not_found');
    expect(out.tags.app).toBe('customer');
  });
});

describe('scrubString', () => {
  it('handles multiple secrets in one string', () => {
    expect(scrubString('sk_live_aaaaaaaaaaaa and whsec_bbbbbbbbbbbb')).toBe(
      '[stripe-key] and [stripe-webhook-secret]',
    );
  });
});
