// Provider registration wall — collects sole-trader details after first sign-in.
// Lives outside the (app) route group so the dashboard layout guard can
// redirect here without looping.
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Complete registration — Urban Assist' };

export default async function RegisterPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db
    .from('profiles')
    .select('registration_completed, full_name, email')
    .eq('id', user.id)
    .single();
  if (profile?.registration_completed) redirect('/');

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-lg px-5 py-10">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Almost there
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">
            Complete your registration
          </h1>
          <p className="mt-2 text-sm text-muted">
            Tell us about you and your business. You&apos;ll upload your ID and
            insurance documents in the next step.
          </p>
        </header>
        <RegisterForm
          initialName={profile?.full_name ?? ''}
          initialEmail={profile?.email ?? ''}
        />
      </div>
    </div>
  );
}
