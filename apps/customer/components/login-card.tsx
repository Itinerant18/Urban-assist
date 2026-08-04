'use client';

import Link from 'next/link';

export function LoginCard({ redirectTo = '/' }: { redirectTo?: string }) {
  const target = `/login?redirect=${encodeURIComponent(redirectTo)}`;
  return (
    <div className="rounded-2xl border border-hairline bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-bold text-ink">Sign in to continue</h2>
      <p className="mt-2 text-sm text-muted">
        You need to be signed in to view this page. Join Urban Assist to book, track, and manage
        your home services in one place.
      </p>
      <Link
        href={target}
        className="tap mt-5 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:bg-accent-hover"
      >
        Sign in
      </Link>
    </div>
  );
}
