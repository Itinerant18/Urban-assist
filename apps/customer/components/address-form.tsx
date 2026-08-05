'use client';
// Shared add-address form: postcode → Find → pick a premise → save.
// Used by the booking flow and the account page.
//
// Postcode-first is the UK convention (and the fastest path on a phone): the
// customer types 7 characters instead of a full address. The lookup already
// returned `addresses[]` — the form just never rendered them, so everyone typed
// their street name anyway.

import * as React from 'react';
import { Button, Field, Input, Spinner, cn } from '@urban-assist/ui';
import { UK_POSTCODE_RE } from '@urban-assist/lib';
import type { PostcodeAddress } from '@urban-assist/integrations/postcode';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';

export function AddressForm({
  onAdded,
  onCancel,
}: {
  onAdded: (id: string) => void;
  onCancel?: () => void;
}) {
  const [pc, setPc] = React.useState('');
  const [label, setLabel] = React.useState('Home');
  const [line1, setLine1] = React.useState('');
  const [line2, setLine2] = React.useState('');
  const [city, setCity] = React.useState('');
  const [lat, setLat] = React.useState<number | null>(null);
  const [lng, setLng] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [looking, setLooking] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [candidates, setCandidates] = React.useState<PostcodeAddress[] | null>(null);
  const [picked, setPicked] = React.useState<number | null>(null);
  /** Manual entry: either chosen by the customer, or forced when we have no list. */
  const [manual, setManual] = React.useState(false);

  const radioName = React.useId();

  async function lookup() {
    if (!UK_POSTCODE_RE.test(pc)) {
      setErr('Enter a valid UK postcode, for example EC1A 1BB');
      return;
    }
    setLooking(true);
    setErr(null);
    setCandidates(null);
    setPicked(null);
    // Clear coords from any previous lookup — a failed lookup for a new postcode
    // must not save the old postcode's lat/lng (provider matching is radius-based).
    setLat(null);
    setLng(null);
    try {
      const r = await fetch(`/api/postcode/${encodeURIComponent(pc)}`);
      if (!r.ok) throw new Error('We could not find that postcode. Check it and try again.');
      const j = await r.json();
      setLat(j.lat);
      setLng(j.lng);
      const list: PostcodeAddress[] = j.addresses ?? [];
      if (list.length > 0) {
        setCandidates(list);
        setManual(false);
      } else {
        // No premium lookup configured for this postcode — type it in, but keep
        // the district so the city field is not left to guesswork.
        setManual(true);
        if (!city) setCity(j.admin_district ?? j.admin_ward ?? '');
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLooking(false);
    }
  }

  function pick(i: number) {
    const a = candidates![i]!;
    setPicked(i);
    setLine1(a.line1);
    setLine2(a.line2 ?? '');
    setCity(a.city);
  }

  const showFields = manual || picked !== null;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error('Sign in required');
      const { data, error } = await supabase()
        .from('addresses')
        .insert({
          profile_id: user.id,
          label,
          line1,
          line2: line2 || null,
          city,
          postcode: pc.toUpperCase(),
          lat,
          lng,
          is_default: true,
        })
        .select()
        .single();
      if (error) throw error;
      onAdded(data.id);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-hairline bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Label">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Postcode">
          <div className="flex gap-2">
            <Input
              value={pc}
              onChange={(e) => setPc(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  lookup();
                }
              }}
              placeholder="EC1A 1BB"
              autoComplete="postal-code"
              inputMode="text"
              aria-describedby={err ? 'address-error' : undefined}
            />
            <Button type="button" variant="outline" onClick={lookup} disabled={looking || !pc}>
              {looking ? <Spinner label="Searching" /> : 'Find'}
            </Button>
          </div>
        </Field>
      </div>

      {candidates && candidates.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-xs font-medium text-muted">
            {candidates.length} address{candidates.length === 1 ? '' : 'es'} at {pc.toUpperCase()}
          </legend>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-hairline">
            {candidates.map((a, i) => (
              <label
                key={a.formatted + i}
                className={cn(
                  'tap flex cursor-pointer items-center gap-3 border-b border-hairline px-3 py-2.5 text-sm last:border-b-0 transition duration-fast',
                  picked === i ? 'bg-accent/10 font-medium text-ink' : 'hover:bg-bg',
                )}
              >
                <input
                  type="radio"
                  name={radioName}
                  checked={picked === i}
                  onChange={() => pick(i)}
                  className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
                />
                <span>{a.formatted}</span>
              </label>
            ))}
          </div>
          {!manual && (
            <button
              type="button"
              onClick={() => setManual(true)}
              className="text-xs font-medium text-accent-deep underline underline-offset-2"
            >
              My address is not listed — enter it manually
            </button>
          )}
        </fieldset>
      )}

      {showFields && (
        <div className="space-y-2">
          <Field label="Address line 1">
            <Input
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="Flat 3, 12 Example Street"
              autoComplete="address-line1"
            />
          </Field>
          <Field label="Address line 2 (optional)">
            <Input
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              autoComplete="address-line2"
            />
          </Field>
          <Field label="Town / city">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
            />
          </Field>
        </div>
      )}

      {err && (
        <p id="address-error" role="alert" className="text-xs font-medium text-danger">
          {err}
        </p>
      )}

      {/* Map Preview */}
      {lat && lng && (
        <div className="relative mt-2 h-48 overflow-hidden rounded-xl border border-hairline">
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
            <iframe
              title={`Map of ${pc.toUpperCase()}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=16`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-bg/50 p-4 text-center">
              <span className="mb-1 font-mono-utility text-xs text-muted">MAP PREVIEW</span>
              <span className="text-xs text-muted">
                Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={save} disabled={busy || !pc || !line1 || !city}>
          {busy && <Spinner />}
          {busy ? 'Saving…' : 'Save address'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {!candidates && !manual && (
        <p className="text-xs text-muted">
          Enter your postcode and choose Find — we will look up the address for you.{' '}
          <button
            type="button"
            onClick={() => setManual(true)}
            className="font-medium text-accent-deep underline underline-offset-2"
          >
            Enter it manually
          </button>
          .
        </p>
      )}
    </div>
  );
}
