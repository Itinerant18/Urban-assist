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
          region: data.admin_ward ?? data.region ?? '',
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
      <form onSubmit={handleSubmit} className={`relative ${className}`}>
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={postcode}
          onChange={(e) => { setPostcode(e.target.value.toUpperCase()); setError(null); }}
          placeholder={placeholder}
          className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-12 text-[13px] text-ink placeholder:text-muted focus:outline-none"
          style={{ minHeight: 40 }}
        />
        <button
          type="submit"
          disabled={busy || !postcode.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg bg-accent text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
        </button>
        {error && (
          <p className="absolute -bottom-5 left-0 text-[10px] text-danger">{error}</p>
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
