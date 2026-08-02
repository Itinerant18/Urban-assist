import { LoginForm } from './login-form';
import { Suspense } from 'react';

export const metadata = { title: 'Provider sign in — Urban Assist Pro' };

export default function Page() {
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
          <p className="mt-6 font-mono-utility text-muted">For providers</p>
          <h1 className="font-display text-2xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to manage your jobs and earnings.</p>
        </div>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-hairline" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
