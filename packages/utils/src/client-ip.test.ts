import { describe, expect, it } from 'vitest';
import { getClientIp, rateLimitKey } from './client-ip';

const h = (init: Record<string, string>) => new Headers(init);

describe('getClientIp', () => {
  // The whole point. X-Forwarded-For is client-settable and proxies append to it, so its
  // leftmost value is attacker-controlled. Trusting it is what made the OTP limiter
  // bypassable.
  it('ignores X-Forwarded-For entirely', () => {
    expect(getClientIp(h({ 'x-forwarded-for': '1.2.3.4' }))).toBeNull();
    expect(getClientIp(h({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBeNull();
  });

  it('does not let a forged X-Forwarded-For override a trusted header', () => {
    const ip = getClientIp(
      h({ 'x-forwarded-for': '9.9.9.9', 'cf-connecting-ip': '203.0.113.7' }),
    );
    expect(ip).toBe('203.0.113.7');
  });

  it('prefers cf-connecting-ip, then vercel, then x-real-ip', () => {
    expect(
      getClientIp(h({ 'cf-connecting-ip': '1.1.1.1', 'x-vercel-forwarded-for': '2.2.2.2', 'x-real-ip': '3.3.3.3' })),
    ).toBe('1.1.1.1');
    expect(getClientIp(h({ 'x-vercel-forwarded-for': '2.2.2.2', 'x-real-ip': '3.3.3.3' }))).toBe('2.2.2.2');
    expect(getClientIp(h({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3');
  });

  it('takes the first entry of a trusted list header', () => {
    expect(getClientIp(h({ 'x-vercel-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe('203.0.113.7');
  });

  it('handles IPv6 and strips brackets and ports', () => {
    expect(getClientIp(h({ 'cf-connecting-ip': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(getClientIp(h({ 'cf-connecting-ip': '[2001:db8::1]' }))).toBe('2001:db8::1');
    expect(getClientIp(h({ 'cf-connecting-ip': '203.0.113.7:54321' }))).toBe('203.0.113.7');
  });

  it('rejects junk rather than passing it through as a key', () => {
    for (const bad of ['not-an-ip', '999.1.1.1', '', '   ', 'DROP TABLE', '1.2.3']) {
      expect(getClientIp(h({ 'cf-connecting-ip': bad })), bad).toBeNull();
    }
  });
});

describe('rateLimitKey', () => {
  it('keys on the trusted IP when there is one', () => {
    expect(rateLimitKey(h({ 'cf-connecting-ip': '203.0.113.7' }))).toBe('ip:203.0.113.7');
  });

  it('falls back to the supplied identifier, not a shared bucket', () => {
    expect(rateLimitKey(h({}), '+447700900001')).toBe('id:+447700900001');
  });

  it('falls back to a shared bucket only as a last resort', () => {
    // Fail-closed: without a trusted IP or an identifier, everyone shares one allowance.
    // Inconvenient by design — the alternative was silently unlimited.
    expect(rateLimitKey(h({}))).toBe('shared:no-trusted-ip');
  });

  it('cannot be varied by a spoofed X-Forwarded-For', () => {
    const a = rateLimitKey(h({ 'x-forwarded-for': 'aaa' }), '+447700900001');
    const b = rateLimitKey(h({ 'x-forwarded-for': 'bbb' }), '+447700900001');
    expect(a).toBe(b);
  });
});
