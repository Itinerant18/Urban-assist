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
    });

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
    });
    expect(out.user).toEqual({ id: 'u1' });
  });

  it('redacts sensitive keys anywhere in extra/contexts, at depth', () => {
    const out = scrubSentryEvent({
      extra: {
        booking: {
          id: 'keep',
          address: '14 Upper Street',
          customer: { phone: '07700900001', full_name: 'Jordan Lee' },
        },
      },
    });
    const b: any = out.extra.booking;
    expect(b.id).toBe('keep');
    expect(b.address).toBe('[redacted]');
    expect(b.customer.phone).toBe('[redacted]');
    expect(b.customer.full_name).toBe('[redacted]');
  });

  it('redacts secrets embedded in free-text messages', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N';
    const out = scrubSentryEvent({
      message: `auth failed for ${jwt} using sk_test_abcdef123456 and pi_1A2b3C_secret_9Z8y7X`,
      exception: { values: [{ value: `phone 07700900123 rejected` }] },
    });

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
    });
    expect(out.breadcrumbs[0].message).toBe('called [phone]');
    expect(out.breadcrumbs[0].data.start_code).toBe('[redacted]');
    expect(out.breadcrumbs[0].data.keep).toBe('yes');
  });

  it('survives a cyclic object without hanging', () => {
    const cyclic: any = { name: 'root' };
    cyclic.self = cyclic;
    expect(() => scrubSentryEvent({ extra: { cyclic } })).not.toThrow();
  });

  it('leaves an event with nothing sensitive untouched', () => {
    const out = scrubSentryEvent({ message: 'booking_not_found', tags: { app: 'customer' } });
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
