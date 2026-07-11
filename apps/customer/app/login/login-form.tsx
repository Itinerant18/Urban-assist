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
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(COUNTRIES[0]);
  const [phoneVal, setPhoneVal] = React.useState('');

  // OTP code
  const [otp, setOtp] = React.useState('');

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to redirect after login (checkout gate passes ?redirect=/book/xxx)
  const redirectTo = searchParams.get('redirect') || '/';

  // Clean and format phone number
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

  // Send SMS OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
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

  // Verify OTP — on success, redirect immediately (no password step)
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
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

      // Authenticated — go to wherever the user was headed
      router.replace(redirectTo);
    } catch (err: any) {
      setError(err.message ?? 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      {phase === 'enter' ? (
        /* Enter Phone Screen */
        <form onSubmit={handleSendOtp} className="space-y-3">
          <Field label="Mobile phone number">
            <div className="flex gap-2">
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const found = COUNTRIES.find((c) => c.code === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="rounded-lg border border-input bg-card px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
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
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button size="block" type="submit" disabled={loading || !phoneVal}>
            {loading ? 'Sending…' : 'Send verification code'}
          </Button>
          <p className="text-center text-xs text-muted">
            We&apos;ll send a 6-digit SMS code to verify your number.
          </p>
        </form>
      ) : (
        /* Enter OTP Verification Code Screen */
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <Field label="6-digit code" hint={`Sent to ${selectedCountry.dial} ${phoneVal}`}>
            <Input
              autoFocus
              required
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button size="block" type="submit" disabled={loading || otp.length < 6}>
            {loading ? 'Verifying…' : 'Verify and continue'}
          </Button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setPhase('enter'); setOtp(''); setError(null); }}
              className="text-xs text-muted hover:text-ink"
            >
              Use a different number
            </button>
            <button
              type="button"
              onClick={handleSendOtp as any}
              disabled={loading}
              className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
