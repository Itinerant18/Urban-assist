import { describe, expect, it } from 'vitest';
import { getProtectedRedirectParams } from './middleware';

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
