'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { CheckCircle2, AlertCircle, FileText, UploadCloud, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';

interface DocumentRow {
  id: string;
  doc_type: string;
  storage_path: string;
  uploaded_at: string;
}

const docTypes = [
  { value: 'id', label: 'Government ID', desc: 'Passport or Driving License' },
  { value: 'insurance', label: 'Public Liability Insurance', desc: 'Required minimum coverage of £1M' },
  { value: 'certification', label: 'Trade Certification (Optional)', desc: 'Trade qualifications or memberships' },
];

interface OnboardingClientProps {
  profile: any;
  initialDocs: DocumentRow[];
}

export function OnboardingClient({ profile, initialDocs }: OnboardingClientProps) {
  const router = useRouter();
  const [docs, setDocs] = React.useState<DocumentRow[]>(initialDocs);
  const [expandedDoc, setExpandedDoc] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // Stats calculation — all 3 doc types count toward progress.
  const requiredTypes = ['id', 'insurance'];
  const haveTypes = new Set(docs.map((d) => d.doc_type));
  const completionPercentage = Math.floor(
    (docTypes.filter((dt) => haveTypes.has(dt.value)).length / docTypes.length) * 100
  );
  const missingRequired = requiredTypes.some((t) => !haveTypes.has(t));

  // ponytail: per-doc status derived from profiles.kyc_status; add provider_documents.status column when admin reviews docs individually
  const getDocStatus = (type: string) => {
    const doc = docs.find((d) => d.doc_type === type);
    if (!doc) return { label: 'Missing', tone: 'danger' as const, icon: <AlertCircle className="h-4 w-4 text-accent" /> };
    if (profile.kyc_status === 'approved') return { label: 'Approved', tone: 'success' as const, icon: <CheckCircle2 className="h-4 w-4 text-success" /> };
    if (profile.kyc_status === 'rejected') return { label: 'Rejected', tone: 'danger' as const, icon: <AlertCircle className="h-4 w-4 text-danger" /> };
    return { label: 'Pending Review', tone: 'accent' as const, icon: <FileText className="h-4 w-4 text-accent" /> };
  };

  const handleFileSelect = async (type: string, file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErr('File too large (max 8 MB)');
      return;
    }

    setBusy(type);
    setErr(null);
    setOk(null);

    try {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in required');

      const path = `${user.id}/${type}-${Date.now()}-${file.name}`;
      
      const { error: upErr } = await sb.storage.from('provider_documents').upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      // Insert row into provider_documents table
      const { data: newDoc, error: rowErr } = await sb
        .from('provider_documents')
        .insert({ provider_id: user.id, doc_type: type, storage_path: path })
        .select('*')
        .single();
      if (rowErr) throw rowErr;

      // Trigger KYC verification check on the server
      await fetch('/api/kyc/verify', { method: 'POST' });

      // Replace any prior doc of this type locally (re-upload after rejection).
      setDocs((prev) => [...prev.filter((d) => d.doc_type !== type), newDoc]);
      setOk('Document uploaded successfully.');
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const deleteDoc = async (docId: string, path: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    setBusy('delete');
    try {
      const sb = supabase();
      const { error: storageErr } = await sb.storage.from('provider_documents').remove([path]);
      if (storageErr) throw storageErr;

      const { error: dbErr } = await sb.from('provider_documents').delete().eq('id', docId);
      if (dbErr) throw dbErr;

      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setOk('Document removed.');
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in required');
      // 'pending' = awaiting admin review (enum: pending | approved | rejected).
      const { error } = await sb.from('profiles').update({ kyc_status: 'pending' }).eq('id', user.id);
      if (error) throw error;
      router.refresh();
      router.push('/');
    } catch (e: any) {
      setErr(e.message);
      setSubmitting(false);
    }
  };

  const renderUploadBox = (type: string) => (
    <div className="mt-3 space-y-2">
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-input-border rounded-xl p-5 bg-white hover:bg-bg/25 cursor-pointer transition">
        <div className="flex flex-col items-center text-center space-y-1">
          <UploadCloud className="h-8 w-8 text-muted mx-auto" />
          <span className="text-xs font-bold text-ink">Choose file or drag here</span>
          <span className="text-[10px] text-muted">PDF or Images (PNG, JPG) up to 8MB</span>
          <span className="mt-1 inline-block rounded-lg bg-ink px-3 py-1.5 text-[10px] font-bold text-white">Upload File</span>
        </div>
        <input
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(type, file);
          }}
          disabled={!!busy}
        />
      </label>
      {/* Mobile-only camera capture */}
      <label className="flex items-center justify-center gap-2 rounded-xl border border-input-border bg-white px-4 py-2.5 text-xs font-bold text-ink cursor-pointer transition hover:bg-bg/25 lg:hidden">
        <Camera className="h-4 w-4 text-muted" /> Take Photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(type, file);
          }}
          disabled={!!busy}
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Mobile Top Progress Banner */}
      <Card className="lg:hidden border border-hairline bg-white p-4 rounded-xl shadow-card">
        <div className="flex items-center justify-between">
          <span className="font-mono-utility text-xs text-muted">Verification Status</span>
          <span className="font-display font-extrabold text-accent">{completionPercentage}% Complete</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-hairline">
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
        </div>
      </Card>

      {/* Accordions List (mobile accordion / desktop always expanded) */}
      <div className="space-y-3">
        {docTypes.map((dt, i) => {
          const status = getDocStatus(dt.value);
          const doc = docs.find((d) => d.doc_type === dt.value);
          const isExpanded = expandedDoc === dt.value;
          const isRejected = !!doc && profile.kyc_status === 'rejected';

          return (
            <Card
              key={dt.value}
              className={`p-0 border rounded-xl overflow-hidden bg-white shadow-card transition-colors ${
                isExpanded ? 'border-accent lg:border-hairline' : 'border-hairline'
              }`}
            >
              {/* Accordion Header — collapse toggle is mobile-only */}
              <button
                onClick={() => setExpandedDoc(isExpanded ? null : dt.value)}
                className="w-full flex items-center justify-between p-4 text-left transition hover:bg-bg/10 lg:pointer-events-none"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{status.icon}</span>
                  <div>
                    <h4 className="font-bold text-sm text-ink">{i + 1}. {dt.label}</h4>
                    <p className="text-xs text-muted mt-0.5">{dt.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="lg:hidden">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                  </span>
                </div>
              </button>

              {/* Accordion Content — always shown on lg+ */}
              <div className={`${isExpanded ? 'block' : 'hidden'} lg:block border-t border-hairline bg-bg/5 p-4 space-y-3`}>
                {doc && (
                  <div className="flex items-center justify-between border border-hairline bg-white p-3 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-ink block truncate">
                        {doc.storage_path.split('/').pop()}
                      </span>
                      <span className="text-[10px] text-muted block mt-0.5">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    {profile.kyc_status !== 'approved' && (
                      <button
                        onClick={() => deleteDoc(doc.id, doc.storage_path)}
                        disabled={!!busy}
                        className="shrink-0 rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="Remove document"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                {isRejected && (
                  <p className="text-xs font-semibold text-danger">
                    This document was rejected. Please upload a new copy.
                  </p>
                )}
                {(!doc || isRejected) && renderUploadBox(dt.value)}
                {busy === dt.value && <p className="text-xs text-accent font-semibold animate-pulse">Uploading file...</p>}
              </div>
            </Card>
          );
        })}
      </div>

      {err && <p className="text-xs font-semibold text-danger pl-0.5">{err}</p>}
      {ok && <p className="text-xs font-semibold text-success pl-0.5">{ok}</p>}

      {/* Submit Button Actions */}
      <div className="pt-2">
        {/* Desktop inline button */}
        <div className="hidden lg:block text-right">
          <Button onClick={submitForReview} disabled={missingRequired || submitting}>
            {submitting ? 'SUBMITTING…' : 'SUBMIT DOCUMENTS FOR REVIEW'}
          </Button>
        </div>

        {/* Mobile Sticky Bottom CTA */}
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <Button onClick={submitForReview} disabled={missingRequired || submitting} size="block">
            {submitting ? 'SUBMITTING…' : 'SUBMIT FOR ADMIN REVIEW'}
          </Button>
        </div>
      </div>
    </div>
  );
}
