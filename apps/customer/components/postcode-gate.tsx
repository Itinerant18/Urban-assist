'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight, Loader2 } from 'lucide-react';

interface PostcodeGateProps {
  /** Placeholder text for the input */
  placeholder?: string;
  /** CSS class for the outer wrapper */
  className?: string;
  /** Visual variant: 'hero' for the desktop landing, 'compact' for the mobile header */
  variant?: 'hero' | 'compact';
}

export function PostcodeGate({
  placeholder = 'Enter your postcode',
  className = '',
  variant = 'hero',
}: PostcodeGateProps) {
  const [postcode, setPostcode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 3) {
      setError('Please enter a valid postcode.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/postcode/${encodeURIComponent(cleaned)}`);
      if (!res.ok) {
        // Postcode not found or not serviceable
        router.push(`/coming-soon?postcode=${encodeURIComponent(cleaned)}`);
        return;
      }

      // Valid postcode — store in localStorage so the app remembers location
      const data = await res.json();
      localStorage.setItem(
        'ua_location',
        JSON.stringify({
          postcode: data.postcode,
          lat: data.lat,
          lng: data.lng,
          region: data.admin_district ?? data.admin_ward ?? data.region ?? '',
        }),
      );

      // Navigate to browse services
      router.push('/services');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className={className} noValidate>
        <label htmlFor="mobile-postcode" className="sr-only">Your postcode</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="mobile-postcode"
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            value={postcode}
            onChange={(e) => { setPostcode(e.target.value.toUpperCase()); setError(null); }}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'mobile-postcode-error' : undefined}
            className="min-h-12 w-full rounded-xl border border-transparent bg-white py-3 pl-10 pr-14 text-[16px] font-semibold uppercase tracking-[0.03em] text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={busy || !postcode.trim()}
            className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-[10px] bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={busy ? 'Checking postcode' : 'Check postcode'}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {error && (
          <p id="mobile-postcode-error" className="mt-2 rounded-lg bg-white px-3 py-2 text-[12px] font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
      </form>
    );
  }

  // Hero variant (desktop)
  return (
    <form onSubmit={handleSubmit} className={`w-full max-w-md ${className}`}>
      <label className="mb-2 block text-[13px] font-semibold text-ink">
        Check if we serve your area
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={postcode}
            onChange={(e) => { setPostcode(e.target.value.toUpperCase()); setError(null); }}
            placeholder={placeholder}
            className="w-full rounded-xl border border-input-border bg-white py-3 pl-10 pr-4 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !postcode.trim()}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>Check <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </form>
  );
}
