import { afterEach, describe, expect, it } from 'vitest';
import { getClientIp, rateLimitKey, trustsCloudflareClientIp } from './client-ip';

const h = (init: Record<string, string>) => new Headers(init);

afterEach(() => {
  delete process.env.TRUST_CLOUDFLARE_CLIENT_IP;
});

describe('getClientIp — default (no Cloudflare in front)', () => {
  // The original bug. X-Forwarded-For is client-settable and proxies append to it, so its
  // leftmost value is attacker-controlled. Trusting it made the OTP limiter bypassable.
  it('ignores X-Forwarded-For entirely', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '1.2.3.4' }))).toBeNull();
    expect(getClientIp(h({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBeNull();
  });

  // The subtler bug, and why the flag exists: while the Vercel origin is directly reachable,
  // a client can send cf-connecting-ip itself. Trusting it by default would have
  // reintroduced the bypass under a different header name.
  it('ignores cf-connecting-ip unless explicitly trusted', () => {
    expect(getClientIp(h({ 'cf-connecting-ip': '9.9.9.9' }))).toBeNull();
  });

  it('does not let a forged header override a platform one', () => {
    const ip = getClientIp(
      h({ 'x-forwarded-for': '9.9.9.9', 'cf-connecting-ip': '8.8.8.8', 'x-real-ip': '203.0.113.7' }),
    );
    expect(ip).toBe('203.0.113.7');
  });

  it('prefers x-vercel-forwarded-for over x-real-ip', () => {
    expect(getClientIp(h({ 'x-vercel-forwarded-for': '2.2.2.2', 'x-real-ip': '3.3.3.3' }))).toBe('2.2.2.2');
  });

  it('takes the first entry of a list header', () => {
    expect(getClientIp(h({ 'x-vercel-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe('203.0.113.7');
  });
});

describe('getClientIp — with Cloudflare trusted', () => {
  it('uses cf-connecting-ip', () => {
    process.env.TRUST_CLOUDFLARE_CLIENT_IP = '1';
    expect(getClientIp(h({ 'cf-connecting-ip': '203.0.113.9', 'x-real-ip': '10.0.0.1' }))).toBe('203.0.113.9');
  });

  // Falling back would put every user behind one Cloudflare colo into a single rate-limit
  // bucket, because x-real-ip then holds the edge address, not the client's.
  it('returns null rather than falling back to the Cloudflare edge address', () => {
    process.env.TRUST_CLOUDFLARE_CLIENT_IP = '1';
    expect(getClientIp(h({ 'x-real-ip': '10.0.0.1', 'x-vercel-forwarded-for': '10.0.0.2' }))).toBeNull();
  });

  it('reads the flag from truthy spellings only', () => {
    process.env.TRUST_CLOUDFLARE_CLIENT_IP = 'true';
    expect(trustsCloudflareClientIp()).toBe(true);
    process.env.TRUST_CLOUDFLARE_CLIENT_IP = '0';
    expect(trustsCloudflareClientIp()).toBe(false);
    process.env.TRUST_CLOUDFLARE_CLIENT_IP = '';
    expect(trustsCloudflareClientIp()).toBe(false);
  });
});

describe('getClientIp — canonicalisation', () => {
  it('handles IPv6, brackets, ports and zone indices', () => {
    expect(getClientIp(h({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(getClientIp(h({ 'x-real-ip': '[2001:db8::1]' }))).toBe('2001:db8::1');
    expect(getClientIp(h({ 'x-real-ip': '203.0.113.7:54321' }))).toBe('203.0.113.7');
    // A zone index is valid on the wire but Postgres `inet` rejects it.
    expect(getClientIp(h({ 'x-real-ip': 'fe80::1%eth0' }))).toBe('fe80::1');
  });

  // One client must not occupy two buckets, and the admin audit column must not receive two
  // spellings of one address.
  it('unwraps IPv4-mapped IPv6 and lowercases', () => {
    expect(getClientIp(h({ 'x-real-ip': '::ffff:1.2.3.4' }))).toBe('1.2.3.4');
    expect(getClientIp(h({ 'x-real-ip': '2001:DB8::1' }))).toBe('2001:db8::1');
  });

  // These all passed the previous permissive regex and would have reached a Postgres `inet`
  // parameter in the admin audit path, raising 22P02 inside the login flow.
  it('rejects malformed addresses instead of passing them through', () => {
    for (const bad of [
      'not-an-ip',
      '999.1.1.1',
      '',
      '   ',
      'DROP TABLE',
      '1.2.3',
      '::::',
      'deadbeefcafebabe::1',
      '0:0:0:0:0:0:0:0:0:0:0:0',
      '1:2:3:4:5:6:7:8:9',
      '12345::1',
    ]) {
      expect(getClientIp(h({ 'x-real-ip': bad })), bad).toBeNull();
    }
  });

  it('still accepts the full 8-group and compressed forms', () => {
    expect(getClientIp(h({ 'x-real-ip': '2001:0db8:0000:0000:0000:0000:0000:0001' }))).toBe(
      '2001:0db8:0000:0000:0000:0000:0000:0001',
    );
    expect(getClientIp(h({ 'x-real-ip': '::1' }))).toBe('::1');
    expect(getClientIp(h({ 'x-real-ip': '::' }))).toBe('::');
  });
});

describe('rateLimitKey', () => {
  it('keys on the trusted IP when there is one', () => {
    expect(rateLimitKey(h({ 'x-real-ip': '203.0.113.7' }))).toBe('ip:203.0.113.7');
  });

  it('falls back to the supplied identifier, not a shared bucket', () => {
    expect(rateLimitKey(h({}), '+447700900001')).toBe('id:+447700900001');
  });

  it('falls back to a shared bucket only as a last resort', () => {
    // Fail-closed: without a trusted IP or an identifier, everyone shares one allowance.
    expect(rateLimitKey(h({}))).toBe('shared:no-trusted-ip');
  });

  it('cannot be varied by a spoofed header', () => {
    const a = rateLimitKey(h({ 'x-forwarded-for': 'aaa', 'cf-connecting-ip': '1.1.1.1' }), '+447700900001');
    const b = rateLimitKey(h({ 'x-forwarded-for': 'bbb', 'cf-connecting-ip': '2.2.2.2' }), '+447700900001');
    expect(a).toBe(b);
  });
});
