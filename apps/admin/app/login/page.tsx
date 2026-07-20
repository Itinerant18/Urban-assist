'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? 'Sign-in failed.');
      setLoading(false);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="card w-full max-w-sm">
        <h1 className="font-display text-xl font-bold text-ink mb-1">Urban Assist Admin</h1>
        <p className="text-sm text-muted mb-6">Sign in with your admin credentials.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-hairline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-hairline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            id="admin-login-submit"
            className="tap bg-accent text-white font-semibold rounded-xl px-4 py-2.5 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
