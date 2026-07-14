import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in — Urban Assist' };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="hidden items-center justify-center lg:flex relative overflow-hidden bg-[#fbfaf8]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-bg.png"
          alt="Urban Assist Professionals"
          className="absolute inset-0 w-full h-full object-contain p-12"
        />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-12 pb-28 lg:pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-ink text-sm font-extrabold text-white">
              UA
            </span>
            <span className="font-extrabold text-ink">Urban Assist</span>
          </div>
          <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Log in to manage your home.</p>
          <p className="mt-1 text-sm text-muted">
            New to Urban Assist? You&apos;ll be signed up on first use.
          </p>
        </div>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-hairline" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-8 text-center text-xs text-muted">
          By continuing you agree to the{' '}
          <a className="underline" href="/terms">terms</a> and{' '}
          <a className="underline" href="/privacy">privacy policy</a>.
        </p>
      </div>
    </div>
  );
}
