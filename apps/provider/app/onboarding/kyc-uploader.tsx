'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { UploadCloud } from 'lucide-react';

const TYPES: { value: string; label: string }[] = [
  { value: 'id', label: 'Photo ID' },
  { value: 'insurance', label: 'Insurance certificate' },
  { value: 'certification', label: 'Certification' },
];

export function KycUploader() {
  const router = useRouter();
  const [type, setType] = React.useState('id');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr('Choose a file first');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr('File too large (max 8 MB)');
      return;
    }
    setBusy(true);
    try {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in required');
      const path = `${user.id}/${type}-${Date.now()}-${file.name}`;
      const { error: upErr } = await sb.storage.from('kyc').upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { error: rowErr } = await sb
        .from('provider_documents')
        .insert({ provider_id: user.id, doc_type: type, storage_path: path });
      if (rowErr) throw rowErr;

      // Trigger KYC verification check on the server.
      await fetch('/api/kyc/verify', { method: 'POST' });

      setOk('Uploaded successfully.');
      setFileName(null);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="!p-5 space-y-4">
      <h3 className="font-display text-sm font-semibold text-ink">Upload document</h3>
      <form onSubmit={upload} className="space-y-4">
        <Field label="Document type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="tap w-full rounded-xl border border-input-border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-ink focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        
        <Field label="Select file">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-input-border rounded-xl p-6 bg-white hover:bg-bg/25 cursor-pointer transition focus-within:ring-2 focus-within:ring-accent">
            <div className="flex flex-col items-center text-center">
              <UploadCloud className="mx-auto h-10 w-10 text-muted" />
              <span className="mt-2 text-sm font-medium text-ink">
                {fileName ? fileName : 'Choose a file or drag here'}
              </span>
              <span className="mt-1 text-xs text-muted">
                PDF or Images (PNG, JPG) up to 8MB
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={handleFileChange}
              required
            />
          </label>
        </Field>

        {err && <p className="text-xs font-medium text-danger">{err}</p>}
        {ok && <p className="text-xs font-medium text-success">{ok}</p>}
        <Button type="submit" size="block" disabled={busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </Button>
      </form>
      <p className="text-[11px] text-muted">
        Files are stored in a private bucket (<code className="font-mono-utility">kyc</code>) — only you and admins can read them.
      </p>
    </Card>
  );
}


