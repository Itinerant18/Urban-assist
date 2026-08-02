'use client';
import * as React from 'react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * /api/auth/start already normalises and accepts both UK and India numbers, but this
 * form hardcoded 🇬🇧 +44 with maxLength=10, so the +91 branch was unreachable.
 * Kept in sync with the server regexes in that route.
 */
type Country = {
  code: 'GB' | 'IN';
  dial: string;
  name: string;
  flag: string;
  placeholder: string;
  validate: (val: string) => boolean;
};

const COUNTRIES: Country[] = [
  {
    code: 'GB',
    dial: '+44',
    name: 'UK',
    flag: '🇬🇧',
    placeholder: '7123 456789',
    validate: (v) => /^7\d{9}$/.test(v),
  },
  {
    code: 'IN',
    dial: '+91',
    name: 'India',
    flag: '🇮🇳',
    placeholder: '98765 43210',
    validate: (v) => /^[6-9]\d{9}$/.test(v),
  },
];

const RESEND_SECONDS = 30;

// wrong_app gets its own banner below rather than an inline error, since it is a
// state the provider arrives in rather than a mistake they just made.
const SIGN_IN_ERRORS: Record<string, string> = {};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [phase, setPhase] = React.useState<'phone' | 'otp'>('phone');
  const [country, setCountry] = React.useState<Country>(COUNTRIES[0]);
  const [local, setLocal] = React.useState('');
  const [e164, setE164] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  // The layout guard redirects here with ?error=wrong_app and ?redirect=…; both were
  // previously sent and silently ignored.
  const redirectTo = params.get('redirect') || '/';
  const entryError = params.get('error');

  React.useEffect(() => {
    if (entryError && SIGN_IN_ERRORS[entryError]) setErr(SIGN_IN_ERRORS[entryError]);
  }, [entryError]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const valid = country.validate(local);

  async function sendCode(e?: React.FormEvent, isResend = false) {
    if (e) e.preventDefault();
    if (!valid) return;
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: `${country.dial}${local}` }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 429
            ? 'Too many attempts. Wait a minute and try again.'
            : j.error ?? 'Could not send code',
        );
      }
      setE164(j.phone ?? `${country.dial}${local}`);
      setPhase('otp');
      setCooldown(RESEND_SECONDS);
      if (isResend) setNotice('New code sent.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErr(null);
    setNotice(null);
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

      router.replace(profile?.registration_completed ? redirectTo : '/register');
    } catch (e: any) {
      setErr(e.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {entryError === 'wrong_app' && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs font-semibold text-danger">
          You&apos;re signed in with a customer account. Use the customer app, or sign in with your
          provider number.
        </div>
      )}
      <div className="rounded-xl border border-hairline bg-white p-5 shadow-card space-y-4">
        {phase === 'phone' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-xs font-medium text-muted">
                Mobile number
              </label>
              <div className="tap flex items-stretch overflow-hidden rounded-xl border border-input-border bg-white focus-within:border-ink">
                <label className="sr-only" htmlFor="country">
                  Country
                </label>
                <select
                  id="country"
                  value={country.code}
                  onChange={(e) => {
                    setCountry(COUNTRIES.find((c) => c.code === e.target.value)!);
                    setLocal('');
                  }}
                  className="select-none border-r border-input-border bg-bg px-3 text-sm font-medium text-ink focus:outline-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.dial}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  autoFocus
                  required
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder={country.placeholder}
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
              disabled={busy || !valid}
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
            {notice && <p className="text-xs text-success font-semibold">{notice}</p>}
            <button
              type="submit"
              disabled={busy || otp.length < 6}
              className="tap w-full rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Verify and continue'}
            </button>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={() => sendCode(undefined, true)}
              className="tap w-full rounded-xl px-5 py-2 text-sm font-medium text-ink transition hover:text-accent disabled:pointer-events-none disabled:text-muted"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase('phone');
                setOtp('');
                setErr(null);
                setNotice(null);
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
