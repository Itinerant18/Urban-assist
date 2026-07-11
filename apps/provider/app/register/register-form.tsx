'use client';
// Three-step registration wizard: Personal → Business & coverage → Bank payout.
// Client-side checks mirror the zod schema in /api/register; the server is the
// source of truth.

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

const NINO_RE = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i;
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const RADIUS_OPTIONS = [5, 10, 15, 20, 30, 50];

type Step = 0 | 1 | 2;
const STEP_LABELS = ['Personal', 'Business', 'Payout'];

function maxDob(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export function RegisterForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(0);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Personal
  const [fullName, setFullName] = React.useState(initialName);
  const [email, setEmail] = React.useState(initialEmail);
  const [dob, setDob] = React.useState('');
  // Business
  const [businessName, setBusinessName] = React.useState('');
  const [nino, setNino] = React.useState('');
  const [utr, setUtr] = React.useState('');
  const [experience, setExperience] = React.useState(0);
  const [bio, setBio] = React.useState('');
  const [postcode, setPostcode] = React.useState('');
  const [radius, setRadius] = React.useState(10);
  // Bank
  const [holderName, setHolderName] = React.useState('');
  const [sortCode, setSortCode] = React.useState(''); // 6 raw digits
  const [accountNumber, setAccountNumber] = React.useState('');

  function validateStep(s: Step): string | null {
    if (s === 0) {
      if (fullName.trim().length < 2) return 'Enter your full name.';
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
      if (!dob) return 'Enter your date of birth.';
      if (dob > maxDob()) return 'You must be at least 18 years old.';
      return null;
    }
    if (s === 1) {
      if (businessName.trim().length < 2) return 'Enter your trading name.';
      if (!NINO_RE.test(nino.trim())) return 'Enter a valid National Insurance number (e.g. QQ123456C).';
      if (utr && !/^\d{10}$/.test(utr)) return 'UTR must be exactly 10 digits.';
      if (bio.length > 500) return 'Bio must be 500 characters or fewer.';
      if (!UK_POSTCODE_RE.test(postcode.trim())) return 'Enter a valid UK postcode.';
      return null;
    }
    if (holderName.trim().length < 2) return 'Enter the account holder name.';
    if (!/^\d{6}$/.test(sortCode)) return 'Sort code must be exactly 6 digits.';
    if (!/^\d{8}$/.test(accountNumber)) return 'Account number must be exactly 8 digits.';
    return null;
  }

  function next() {
    const problem = validateStep(step);
    if (problem) { setErr(problem); return; }
    setErr(null);
    setStep((s) => (s + 1) as Step);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateStep(2);
    if (problem) { setErr(problem); return; }
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          date_of_birth: dob,
          business_name: businessName.trim(),
          nino: nino.trim().toUpperCase(),
          utr_number: utr || undefined,
          years_experience: experience,
          bio: bio.trim(),
          postcode: postcode.trim().toUpperCase(),
          travel_radius_miles: radius,
          bank_account_holder_name: holderName.trim(),
          bank_sort_code: sortCode,
          bank_account_number: accountNumber,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not save — check your details.');
      }
      router.replace('/onboarding');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const sortCodeDisplay = sortCode.replace(/(\d{2})(?=\d)/g, '$1-');

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Step indicator */}
      <ol className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-success text-white'
                    : active
                      ? 'bg-accent text-white'
                      : 'border border-hairline bg-white text-muted'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-xs font-medium ${active ? 'text-ink' : 'text-muted'}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <section className="space-y-4 rounded-xl border border-hairline bg-white p-5 shadow-card">
          <h2 className="font-display text-sm font-semibold text-ink">Personal details</h2>
          <Field label="Full name">
            <input
              className={inputCls}
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field label="Email address" hint="For booking confirmations and invoices — not for sign-in.">
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Date of birth" hint="You must be 18 or over.">
            <input
              className={inputCls}
              type="date"
              max={maxDob()}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </Field>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-hairline bg-white p-5 shadow-card">
          <h2 className="font-display text-sm font-semibold text-ink">Business &amp; coverage</h2>
          <Field label="Trading / business name">
            <input
              className={inputCls}
              autoFocus
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. J. Smith Plumbing"
            />
          </Field>
          <Field label="National Insurance number">
            <input
              className={inputCls}
              value={nino}
              onChange={(e) => setNino(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="QQ123456C"
              maxLength={9}
            />
          </Field>
          <Field label="UTR number (optional)" hint="You can add this later — required before your first payout.">
            <input
              className={inputCls}
              inputMode="numeric"
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10 digits"
            />
          </Field>
          <Field label="Years of experience">
            <input
              className={inputCls}
              type="number"
              min={0}
              max={60}
              value={experience}
              onChange={(e) => setExperience(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
            />
          </Field>
          <Field label="About you" hint={`${bio.length}/500 characters`}>
            <textarea
              className={`${inputCls} min-h-[96px] resize-y`}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell customers about your work, qualifications and what you specialise in."
            />
          </Field>
          <Field label="Operating postcode" hint="The centre of the area you cover.">
            <input
              className={inputCls}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="SW1A 1AA"
              maxLength={8}
            />
          </Field>
          <Field label="Travel radius">
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRadius(m)}
                  className={`tap rounded-full border px-4 py-2 text-sm font-medium transition ${
                    radius === m
                      ? 'border-accent bg-accent text-white'
                      : 'border-input-border bg-white text-charcoal hover:border-ink'
                  }`}
                >
                  {m} mi
                </button>
              ))}
            </div>
          </Field>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-xl border border-hairline bg-white p-5 shadow-card">
          <h2 className="font-display text-sm font-semibold text-ink">Bank payout details</h2>
          <Field label="Account holder name" hint="Must match your legal name.">
            <input
              className={inputCls}
              autoFocus
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field label="Sort code">
            <input
              className={inputCls}
              inputMode="numeric"
              value={sortCodeDisplay}
              onChange={(e) => setSortCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="12-34-56"
              maxLength={8}
            />
          </Field>
          <Field label="Account number">
            <input
              className={inputCls}
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="8 digits"
              maxLength={8}
            />
          </Field>
        </section>
      )}

      {err && <p className="text-xs font-medium text-danger">{err}</p>}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => { setErr(null); setStep((s) => (s - 1) as Step); }}
            className="tap rounded-xl border border-input-border bg-white px-5 py-3 text-sm font-medium text-charcoal transition hover:border-ink"
          >
            Back
          </button>
        )}
        {step < 2 ? (
          <button
            type="button"
            onClick={next}
            className="tap flex-1 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-hover"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            disabled={busy}
            className="tap flex-1 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Complete registration'}
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls =
  'tap w-full rounded-xl border border-input-border bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-muted focus:border-ink focus:outline-none';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
