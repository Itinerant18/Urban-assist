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

  async function handleGoogleLogin() {
    setErr(null);
    try {
      const sb = supabase();
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErr(err.message);
    }
  }

  // Keypad press handler
  const handleKeypadPress = (val: string) => {
    setErr(null);
    if (phase === 'phone') {
      if (val === '<') {
        setLocal((prev) => prev.slice(0, -1));
      } else {
        setLocal((prev) => (prev + val).slice(0, 10));
      }
    } else {
      if (val === '<') {
        setOtp((prev) => prev.slice(0, -1));
      } else {
        setOtp((prev) => (prev + val).slice(0, 6));
      }
    }
  };

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
                  placeholder="7700 900000"
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

        {/* OR Google Auth */}
        <div className="space-y-3 pt-3 border-t border-hairline text-center">
          <div className="relative flex py-2 items-center justify-center">
            <div className="flex-grow border-t border-hairline"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-muted font-mono-utility">OR</span>
            <div className="flex-grow border-t border-hairline"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-bg/25 transition shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.486 0-6.315-2.829-6.315-6.315s2.829-6.315 6.315-6.315c1.69 0 3.129.657 4.225 1.725l3.053-3.053C19.121 2.378 15.937 1 12.24 1A11.238 11.238 0 001 12.24 11.238 11.238 0 0012.24 23.48c6.075 0 11.24-4.385 11.24-11.24 0-.765-.081-1.503-.225-2.215H12.24z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>

      {/* MOBILE KEYPAD SIMULATOR */}
      <div className="lg:hidden bg-bg/5 p-4 rounded-2xl border border-hairline grid grid-cols-3 gap-2 max-w-sm mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => handleKeypadPress(val)}
            className="h-12 rounded-xl bg-white border border-hairline shadow-sm flex items-center justify-center font-bold text-ink hover:bg-bg/40 active:scale-95 transition"
          >
            {val}
          </button>
        ))}
        <div className="h-12" /> {/* empty spacer */}
        <button
          type="button"
          onClick={() => handleKeypadPress('0')}
          className="h-12 rounded-xl bg-white border border-hairline shadow-sm flex items-center justify-center font-bold text-ink hover:bg-bg/40 active:scale-95 transition"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleKeypadPress('<')}
          className="h-12 rounded-xl bg-white border border-hairline shadow-sm flex items-center justify-center font-bold text-ink hover:bg-bg/40 active:scale-95 transition"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
