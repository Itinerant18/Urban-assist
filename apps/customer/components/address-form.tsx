'use client';
// Shared add-address form: postcode lookup → save to `addresses`.
// Used by the booking flow and the account page.

import * as React from 'react';
import { Button, Field, Input } from '@urban-assist/ui';
import { UK_POSTCODE_RE } from '@urban-assist/lib';
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
  const [city, setCity] = React.useState('');
  const [lat, setLat] = React.useState<number | null>(null);
  const [lng, setLng] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function lookup() {
    if (!UK_POSTCODE_RE.test(pc)) {
      setErr('Enter a valid UK postcode');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/postcode/${encodeURIComponent(pc)}`);
      if (!r.ok) throw new Error('Postcode not found');
      const j = await r.json();
      setLat(j.lat);
      setLng(j.lng);
      if (!city) setCity(j.admin_ward ?? '');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

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
    <div className="space-y-2 rounded-xl border border-hairline p-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Postcode">
          <div className="flex gap-2">
            <Input value={pc} onChange={(e) => setPc(e.target.value.toUpperCase())} placeholder="EC1A 1BB" />
            <Button type="button" variant="outline" onClick={lookup} disabled={busy}>Find</Button>
          </div>
        </Field>
      </div>
      <Field label="Address line">
        <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Flat 3, 12 Example Street" />
      </Field>
      <Field label="Town / city">
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>
      {err && <p className="text-xs text-danger">{err}</p>}
      
      {/* Map Preview */}
      {lat && lng && (
        <div className="mt-2 rounded-xl overflow-hidden border border-hairline h-48 relative">
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
             <iframe
               width="100%"
               height="100%"
               style={{ border: 0 }}
               loading="lazy"
               allowFullScreen
               src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=16`}
             ></iframe>
          ) : (
             <div className="w-full h-full bg-bg/50 flex flex-col items-center justify-center p-4 text-center">
               <span className="font-mono-utility text-xs text-muted mb-1">MAP PREVIEW</span>
               <span className="text-xs text-muted">Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</span>
             </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={save} disabled={busy || !pc || !line1 || !city}>
          {busy ? 'Saving…' : 'Save address'}
        </Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}
