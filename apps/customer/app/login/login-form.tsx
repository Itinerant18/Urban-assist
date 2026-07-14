'use client';
import * as React from 'react';
import { Button, Field, Input, Card } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { useRouter, useSearchParams } from 'next/navigation';

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
    validate: (val: string) => /^7\d{9}$/.test(val),
  },
  {
    code: 'IN',
    dial: '+91',
    name: 'India',
    flag: '🇮🇳',
    placeholder: '98765 43210',
    validate: (val: string) => /^[6-9]\d{9}$/.test(val),
  },
];

export function LoginForm() {
  const [phase, setPhase] = React.useState<'enter' | 'otp'>('enter');

  // Phone components
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(COUNTRIES[1]); // Default to India as per wireframe +91
  const [phoneVal, setPhoneVal] = React.useState('');
  const [otp, setOtp] = React.useState('');

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get('redirect') || '/';

  const cleanNationalNumber = (num: string) => {
    const raw = num.replace(/\D/g, '');
    return raw.startsWith('0') ? raw.slice(1) : raw;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneVal(cleanNationalNumber(e.target.value));
  };

  const getFullE164 = () => {
    return `${selectedCountry.dial}${phoneVal}`;
  };

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    if (!selectedCountry.validate(phoneVal)) {
      setError(`Invalid mobile number format for ${selectedCountry.name}.`);
      return;
    }

    setLoading(true);
    try {
      const e164 = getFullE164();
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'phone', value: e164 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not send verification code');
      }
      setPhase('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = supabase();
      const e164 = getFullE164();
      const { error } = await sb.auth.verifyOtp({
        phone: e164,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;

      router.replace(redirectTo);
    } catch (err: any) {
      setError(err.message ?? 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
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
      setError(err.message);
    }
  }

  // Keypad simulator helper
  const handleKeypadPress = (val: string) => {
    setError(null);
    if (phase === 'enter') {
      if (val === '<') {
        setPhoneVal((prev) => prev.slice(0, -1));
      } else {
        setPhoneVal((prev) => (prev + val).slice(0, 10));
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
      <Card className="space-y-4 shadow-card border border-hairline bg-white p-5 rounded-xl">
        {phase === 'enter' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Field label="Mobile phone number">
              <div className="flex gap-2">
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const found = COUNTRIES.find((c) => c.code === e.target.value);
                    if (found) setSelectedCountry(found);
                  }}
                  className="rounded-xl border border-hairline bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-semibold"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.dial}
                    </option>
                  ))}
                </select>
                <Input
                  autoFocus
                  required
                  type="tel"
                  placeholder={selectedCountry.placeholder}
                  value={phoneVal}
                  onChange={handlePhoneChange}
                  className="flex-1"
                />
              </div>
            </Field>

            {error && <p className="text-xs text-danger font-semibold">{error}</p>}

            <Button size="block" type="submit" disabled={loading || !phoneVal}>
              {loading ? 'Sending…' : 'SEND OTP'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Field label="6-digit code" hint={`Sent to ${selectedCountry.dial} ${phoneVal}`}>
              <Input
                autoFocus
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="text-center tracking-widest font-bold text-lg"
              />
            </Field>

            {error && <p className="text-xs text-danger font-semibold">{error}</p>}

            <Button size="block" type="submit" disabled={loading || otp.length < 6}>
              {loading ? 'Verifying…' : 'VERIFY & CONTINUE'}
            </Button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPhase('enter');
                  setOtp('');
                  setError(null);
                }}
                className="text-xs text-muted hover:text-ink font-medium"
              >
                Use a different number
              </button>
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={loading}
                className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* OR Google Authenticator */}
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
      </Card>

      {/* Professional Apply Footer (Only Customer login) */}
      <div className="text-center text-xs text-muted">
        Are you a professional?{' '}
        <a href="http://localhost:3001/register" className="text-accent font-bold hover:underline">
          Apply Here
        </a>
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
