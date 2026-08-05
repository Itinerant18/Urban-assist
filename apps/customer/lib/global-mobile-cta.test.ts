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

  // Regression: /services* lives in app/(dashboard) and renders AppShell, so it
  // does have tabs. Claiming otherwise put the Book CTA under the tab bar.
  it('is true on every /services route', () => {
    expect(hasBottomTabs('/services')).toBe(true);
    expect(hasBottomTabs('/services/cleaning')).toBe(true);
    expect(hasBottomTabs('/services/cleaning/deep-clean')).toBe(true);
    expect(hasBottomTabs('/services/cleaning/deep-clean/oven')).toBe(true);
  });

  it('is false where AppShell hides the tab bar', () => {
    expect(hasBottomTabs('/book/x')).toBe(false);
    expect(hasBottomTabs('/book/success')).toBe(false);
    expect(hasBottomTabs('/bookings/abc/rate')).toBe(false);
  });

  it('is false outside the app shell', () => {
    expect(hasBottomTabs('/privacy')).toBe(false);
    expect(hasBottomTabs('/terms')).toBe(false);
    expect(hasBottomTabs('/coming-soon')).toBe(false);
  });
});

describe('coming-soon', () => {
  it('shows no global Book CTA', () => {
    expect(ownsOwnSticky('/coming-soon')).toBe(true);
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
