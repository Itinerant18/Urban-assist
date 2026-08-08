import { describe, expect, it } from 'vitest';
import { getProtectedRedirectParams, markPrivate } from './middleware';

describe('protected-route redirect params', () => {
  it('keeps user query state but removes the flight marker from redirect', () => {
    const params = new URLSearchParams('status=upcoming&_rsc=flight123');

    expect(getProtectedRedirectParams('/bookings', params)).toEqual({
      requestedPath: '/bookings?status=upcoming',
      flightMarker: 'flight123',
    });
  });

  it('handles protected routes without a query string', () => {
    expect(getProtectedRedirectParams('/account', new URLSearchParams())).toEqual({
      requestedPath: '/account',
      flightMarker: null,
    });
  });
});

describe('markPrivate', () => {
  // Defence in depth for the CDN phase: if an edge cache rule is ever scoped slightly too
  // broadly, these headers are what stop one signed-in customer's page being handed to the
  // next visitor.
  it('marks a response uncacheable by shared caches and varying on Cookie', () => {
    const res = markPrivate(new Response(null, { status: 200 }));
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0, must-revalidate');
    expect(res.headers.get('CDN-Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Vary')).toBe('Cookie');
  });

  it('appends Vary rather than replacing existing values', () => {
    // Next emits Vary: RSC, Next-Router-State-Tree, ... — clobbering those risks
    // router-cache correctness.
    const res = markPrivate(new Response(null, { headers: { Vary: 'RSC' } }));
    expect(res.headers.get('Vary')).toContain('RSC');
    expect(res.headers.get('Vary')).toContain('Cookie');
  });

  it('overrides a cacheable value already present', () => {
    const res = markPrivate(new Response(null, { headers: { 'Cache-Control': 's-maxage=31536000' } }));
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });
});
