/**
 * Path helpers for the global mobile Book CTA.
 * Pure so route edge cases (e.g. /book vs /bookings) stay unit-tested.
 */

/** Routes that already own an immersive sticky CTA (wizard / rate / detail actions). */
export function ownsOwnSticky(pathname: string | null): boolean {
  if (!pathname) return false;
  // Public home already owns the primary discovery CTA and bottom navigation.
  if (pathname === '/') return true;
  if (pathname.startsWith('/login')) return true;
  // Nothing to book from a placeholder page.
  if (pathname.startsWith('/coming-soon')) return true;
  // Book wizard only — must not match /bookings (prefix collision).
  if (pathname === '/book' || pathname.startsWith('/book/')) return true;
  // Cart owns Checkout — a second "Book now" CTA mid-purchase is noise.
  if (pathname === '/cart') return true;
  if (/^\/bookings\/[^/]+\/rate\/?$/.test(pathname)) return true;
  // Booking detail: Rate / Confirm cash sticky
  if (/^\/bookings\/[^/]+\/?$/.test(pathname)) return true;
  // Provider profile may show cart sticky
  if (pathname.startsWith('/providers')) return true;
  return false;
}

/**
 * Bottom tab bar present.
 *
 * Must mirror `AppShell.shouldHideBottomNav` + the customer route groups: every
 * page inside `app/(dashboard)` renders AppShell and therefore has tabs — that
 * includes `/services/*`, which this used to deny, which put the Book CTA
 * underneath the tab bar on all four service routes. Only the pages outside the
 * group (`/privacy`, `/terms`, `/coming-soon`, `/login`) have no tabs.
 */
const TABLESS_PREFIXES = ['/privacy', '/terms', '/coming-soon', '/login'];

export function hasBottomTabs(pathname: string | null): boolean {
  if (!pathname) return false;
  if (TABLESS_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return false;
  // Mirrors AppShell.shouldHideBottomNav — immersive flows drop the tab bar.
  if (pathname === '/book' || pathname.startsWith('/book/')) return false;
  if (pathname.endsWith('/success')) return false;
  if (/^\/bookings\/[^/]+\/rate\/?$/.test(pathname)) return false;
  return true;
}

export function resolveCta(pathname: string | null): {
  label: string;
  subtitle?: string;
  href: string;
  ctaLabel: string;
} {
  const path = pathname ?? '/';

  if (path.startsWith('/services/')) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 4) {
      return {
        label: 'Ready',
        subtitle: 'Book this service',
        href: `/browse?category=${encodeURIComponent(parts[1]!)}&q=${encodeURIComponent(parts[3]!.replace(/-/g, ' '))}`,
        ctaLabel: 'Book now',
      };
    }
    if (parts.length >= 3) {
      return {
        label: 'Ready',
        subtitle: 'Choose a pro',
        href: `/browse?category=${encodeURIComponent(parts[1]!)}&q=${encodeURIComponent(parts[2]!.replace(/-/g, ' '))}`,
        ctaLabel: 'Book now',
      };
    }
    if (parts.length >= 2) {
      return {
        label: 'Ready',
        subtitle: 'Find a professional',
        href: `/browse?category=${encodeURIComponent(parts[1]!)}`,
        ctaLabel: 'Browse & book',
      };
    }
  }

  if (path === '/services') {
    return {
      label: 'Services',
      subtitle: 'Find a pro near you',
      href: '/browse',
      ctaLabel: 'Browse & book',
    };
  }

  if (path.startsWith('/bookings')) {
    return {
      label: 'Need help again?',
      subtitle: 'Book another visit',
      href: '/browse',
      ctaLabel: 'Book a service',
    };
  }

  if (path.startsWith('/saved') || path.startsWith('/referrals')) {
    return {
      label: 'Urban Assist',
      subtitle: 'Trusted home help',
      href: '/browse',
      ctaLabel: 'Book now',
    };
  }

  if (path.startsWith('/messages') || path.startsWith('/notifications') || path.startsWith('/help')) {
    return {
      label: 'Need a pro?',
      subtitle: 'Browse services',
      href: '/browse',
      ctaLabel: 'Book now',
    };
  }

  if (path.startsWith('/account')) {
    return {
      label: 'Home help',
      subtitle: 'Book your next visit',
      href: '/browse',
      ctaLabel: 'Book now',
    };
  }

  return {
    label: 'Urban Assist',
    subtitle: 'Book trusted home help',
    href: path.startsWith('/browse') ? '/services' : '/browse',
    ctaLabel: 'Book now',
  };
}
