'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '@urban-assist/ui';

type MfaState = {
  factorId: string;
  challengeId?: string;
  qrCode?: string;
  secret?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mfa, setMfa] = useState<MfaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? 'Sign-in failed.');
      setLoading(false);
      return;
    }

    setMfa({
      factorId: result.factor_id,
      challengeId: result.challenge_id,
      qrCode: result.qr_code,
      secret: result.secret,
    });
    setLoading(false);
  }

  async function handleMfa(event: React.FormEvent) {
    event.preventDefault();
    if (!mfa) return;
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        factor_id: mfa.factorId,
        challenge_id: mfa.challengeId,
        code,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? 'Verification failed.');
      setLoading(false);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="card w-full max-w-sm">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Restricted operations
        </p>
        <h1 className="font-display text-xl font-bold text-ink">Urban Assist Admin</h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          {mfa ? 'Complete two-factor authentication.' : 'Sign in with your admin credentials.'}
        </p>

        {!mfa ? (
          <form onSubmit={handlePassword} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Submit loading={loading} label="Sign in" busyLabel="Signing in…" />
          </form>
        ) : (
          <form onSubmit={handleMfa} className="flex flex-col gap-4">
            {mfa.qrCode && (
              <div className="rounded-xl border border-hairline bg-white p-4 text-center">
                <p className="mb-3 text-xs font-semibold text-ink">Set up your authenticator</p>
                {/* Supabase returns an inline SVG data URL for TOTP enrollment. */}
                <img src={mfa.qrCode} alt="Authenticator enrollment QR code" className="mx-auto h-44 w-44" />
                {mfa.secret && (
                  <p className="mt-3 break-all font-mono-utility text-[10px] text-muted">
                    Manual key: {mfa.secret}
                  </p>
                )}
              </div>
            )}
            <Field label="Six-digit code">
              <Input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center font-mono-utility text-lg tracking-[0.4em]"
              />
            </Field>
            <Submit loading={loading} label="Verify and continue" busyLabel="Verifying…" />
          </form>
        )}

        {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
function Submit({
  loading,
  label,
  busyLabel,
}: {
  loading: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="font-semibold"
    >
      {loading ? busyLabel : label}
    </Button>
  );
}
