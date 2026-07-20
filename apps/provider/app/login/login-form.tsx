'use client';
import * as React from 'react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<'phone' | 'otp'>('phone');
  const [local, setLocal] = React.useState(''); // digits after +44, e.g. 7700900000
  const [e164, setE164] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function sendCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: `+44${local}` }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? 'Could not send code');
      setE164(j.phone ?? `+44${local}`);
      setPhase('otp');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const sb = supabase();
      const { error } = await sb.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' });
      if (error) throw error;

      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign-in failed — try again.');

      const { data: profile } = await sb
        .from('profiles')
        .select('registration_completed')
        .eq('id', user.id)
        .single();

      router.replace(profile?.registration_completed ? '/' : '/register');
    } catch (e: any) {
      setErr(e.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-white p-5 shadow-card space-y-4">
        {phase === 'phone' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs font-medium text-muted">
                UK mobile number
              </label>
              <div className="tap flex items-stretch overflow-hidden rounded-xl border border-input-border bg-white focus-within:border-ink">
                <span className="flex select-none items-center gap-1 border-r border-input-border bg-bg px-3 text-sm font-medium text-ink">
                  🇬🇧 +44
                </span>
                <input
                  id="phone"
                  autoFocus
                  required
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="7123 456789"
                  maxLength={10}
                  className="w-full bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-muted focus:outline-none"
                  value={local}
                  onChange={(e) => setLocal(e.target.value.replace(/\D/g, '').replace(/^0+/, ''))}
                />
              </div>
              <p className="text-xs text-muted">We&apos;ll text you a 6-digit code to sign in.</p>
            </div>
            {err && <p className="text-xs text-danger font-semibold">{err}</p>}
            <button
              type="submit"
              disabled={busy || local.length !== 10}
              className="tap w-full rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'SEND CODE'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="otp" className="text-xs font-medium text-muted">
                6-digit code
              </label>
              <input
                id="otp"
                autoFocus
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="tap w-full rounded-xl border border-input-border bg-white px-3.5 py-2.5 text-center text-lg tracking-[0.4em] text-charcoal placeholder:text-muted focus:border-ink focus:outline-none"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-xs text-muted">Sent to {e164}</p>
            </div>
            {err && <p className="text-xs text-danger font-semibold">{err}</p>}
            <button
              type="submit"
              disabled={busy || otp.length < 6}
              className="tap w-full rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Verify and continue'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase('phone');
                setOtp('');
                setErr(null);
              }}
              className="tap w-full rounded-xl px-5 py-2 text-sm font-medium text-muted transition hover:text-ink"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
