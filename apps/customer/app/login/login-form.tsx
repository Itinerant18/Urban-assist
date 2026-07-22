'use client';
import * as React from 'react';
import { Button, Field, Input, Card } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { normaliseMobile } from '@urban-assist/utils';
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

const PROVIDER_APP_URL = (
  process.env.NEXT_PUBLIC_PROVIDER_APP_URL ?? 'http://localhost:3001'
).replace(/\/$/, '');

export function LoginForm() {
  const [phase, setPhase] = React.useState<'enter' | 'otp'>('enter');

  // Phone components
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(COUNTRIES[1]); // Default to India as per wireframe +91
  const [phoneVal, setPhoneVal] = React.useState('');
  const [showReferralCode, setShowReferralCode] = React.useState(false);
  const [referralCode, setReferralCode] = React.useState('');
  const [otp, setOtp] = React.useState('');

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get('redirect') || '/';
  const wrongApp = searchParams.get('error') === 'wrong_app';

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const cleanNationalNumber = (num: string) => {
    const raw = num.replace(/\D/g, '');
    return raw.startsWith('0') ? raw.slice(1) : raw;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneVal(cleanNationalNumber(e.target.value));
  };

  // Must match what /api/auth/start sent the OTP to, or verification fails.
  const getFullE164 = () => {
    const raw = `${selectedCountry.dial}${phoneVal}`;
    return normaliseMobile(raw) ?? raw;
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
        body: JSON.stringify({
          mode: 'phone',
          value: e164,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not send verification code');
      }
      setPhase('otp');
      setCooldown(30);
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



  return (
    <div className="space-y-6">
      {wrongApp && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs font-semibold text-danger">
          This account is registered as a professional. Use the provider app, or sign in with a
          different number.
        </div>
      )}
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
                  className="rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent font-semibold"
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

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowReferralCode((shown) => !shown)}
                className="text-xs font-semibold text-accent hover:underline"
                aria-expanded={showReferralCode}
              >
                Have a referral code?
              </button>
              {showReferralCode && (
                <Field label="Referral code" hint="Optional">
                  <Input
                    maxLength={32}
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
              )}
            </div>

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
                disabled={loading || cooldown > 0}
                className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
              </button>
            </div>
          </form>
        )}


      </Card>

      {/* Professional Apply Footer (Only Customer login) */}
      <div className="text-center text-xs text-muted">
        Are you a professional?{' '}
        <a href={`${PROVIDER_APP_URL}/register`} className="text-accent font-bold hover:underline">
          Apply Here
        </a>
      </div>


    </div>
  );
}
