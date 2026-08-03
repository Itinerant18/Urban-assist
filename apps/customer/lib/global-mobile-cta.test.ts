import { describe, expect, it } from 'vitest';
import { hasBottomTabs, ownsOwnSticky, resolveCta } from './global-mobile-cta';

describe('ownsOwnSticky', () => {
  it('hides on book wizard paths only', () => {
    expect(ownsOwnSticky('/book')).toBe(true);
    expect(ownsOwnSticky('/book/svc-1')).toBe(true);
  });

  it('does not treat /bookings as the book wizard (prefix collision)', () => {
    expect(ownsOwnSticky('/bookings')).toBe(false);
    expect(ownsOwnSticky('/bookings/')).toBe(false);
  });

  it('hides on booking detail and rate', () => {
    expect(ownsOwnSticky('/bookings/abc')).toBe(true);
    expect(ownsOwnSticky('/bookings/abc/')).toBe(true);
    expect(ownsOwnSticky('/bookings/abc/rate')).toBe(true);
  });

  it('hides on login and provider profiles', () => {
    expect(ownsOwnSticky('/login')).toBe(true);
    expect(ownsOwnSticky('/providers/p1')).toBe(true);
  });

  it('lets home own discovery actions and shows on browse and account', () => {
    expect(ownsOwnSticky('/')).toBe(true);
    expect(ownsOwnSticky('/browse')).toBe(false);
    expect(ownsOwnSticky('/account')).toBe(false);
  });
});

describe('hasBottomTabs', () => {
  it('is true on bookings list (tabs + global CTA)', () => {
    expect(hasBottomTabs('/bookings')).toBe(true);
  });

  it('is false on marketing services and immersive owners', () => {
    expect(hasBottomTabs('/services')).toBe(false);
    expect(hasBottomTabs('/book/x')).toBe(false);
  });
});

describe('resolveCta', () => {
  it('uses bookings-list copy on /bookings', () => {
    expect(resolveCta('/bookings')).toMatchObject({
      label: 'Need help again?',
      href: '/browse',
      ctaLabel: 'Book a service',
    });
  });
});
