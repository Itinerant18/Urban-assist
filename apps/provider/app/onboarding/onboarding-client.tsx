'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { UploadCloud, Camera, X } from 'lucide-react';

interface DocumentRow {
  id: string;
  doc_type: string;
  storage_path: string;
  uploaded_at: string;
}

interface OnboardingClientProps {
  profile: any;
  initialDocs: DocumentRow[];
}

export function OnboardingClient({ profile: _profile, initialDocs }: OnboardingClientProps) {
  const router = useRouter();
  const [docs, setDocs] = React.useState<DocumentRow[]>(initialDocs);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // KYC States
  const [idType, setIdType] = React.useState<'passport' | 'license'>('passport');
  const [bgConsent, setBgConsent] = React.useState(false);
  
  // Webcam States
  const [webcamOpen, setWebcamOpen] = React.useState(false);
  const [localSelfieBlob, setLocalSelfieBlob] = React.useState<Blob | null>(null);
  const [localSelfieUrl, setLocalSelfieUrl] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const governmentIdDoc = docs.find((d) => d.doc_type === 'id');
  const selfieDoc = docs.find((d) => d.doc_type === 'selfie');
  
  const missingRequired = !governmentIdDoc || (!selfieDoc && !localSelfieBlob) || !bgConsent;

  // Cleanup local object URLs
  React.useEffect(() => {
    return () => {
      if (localSelfieUrl) URL.revokeObjectURL(localSelfieUrl);
    };
  }, [localSelfieUrl]);

  const handleFileSelect = async (type: string, file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr('File too large (max 5 MB)');
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

      const { data: newDoc, error: rowErr } = await sb
        .from('provider_documents')
        .insert({ provider_id: user.id, doc_type: type, storage_path: path })
        .select('*')
        .single();
      if (rowErr) throw rowErr;

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

  // Webcam stream handlers
  async function startWebcam() {
    setWebcamOpen(true);
    setLocalSelfieBlob(null);
    if (localSelfieUrl) URL.revokeObjectURL(localSelfieUrl);
    setLocalSelfieUrl(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      setErr('Webcam access error: ' + e.message);
      setWebcamOpen(false);
    }
  }

  function capturePhoto() {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setLocalSelfieBlob(blob);
            const url = URL.createObjectURL(blob);
            setLocalSelfieUrl(url);
            
            // Stop camera stream
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach((track) => track.stop());
            setWebcamOpen(false);
          }
        }, 'image/jpeg');
      }
    }
  }

  function cancelWebcam() {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    setWebcamOpen(false);
  }

  const submitForReview = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in required');

      // Upload local selfie blob if captured but not yet saved
      if (localSelfieBlob && !selfieDoc) {
        const path = `${user.id}/selfie-${Date.now()}.jpeg`;
        const file = new File([localSelfieBlob], 'selfie.jpeg', { type: 'image/jpeg' });
        
        const { error: upErr } = await sb.storage.from('provider_documents').upload(path, file, {
          upsert: false,
          contentType: 'image/jpeg',
        });
        if (upErr) throw upErr;

        const { error: rowErr } = await sb
          .from('provider_documents')
          .insert({ provider_id: user.id, doc_type: 'selfie', storage_path: path });
        if (rowErr) throw rowErr;
      }

      // Update provider kyc_status to pending
      const { error } = await sb.from('profiles').update({ kyc_status: 'pending' }).eq('id', user.id);
      if (error) throw error;

      // Trigger KYC verification check on the server
      await fetch('/api/kyc/verify', { method: 'POST' });

      router.refresh();
      router.push('/');
    } catch (e: any) {
      setErr(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. UPLOAD GOVERNMENT ID */}
        <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-display text-sm font-bold text-ink">1. UPLOAD GOVERNMENT ID</h3>
            <p className="text-xs text-muted">Supported: Passport, Driver's License. Max size: 5MB</p>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIdType('passport')}
                className={`flex-1 rounded-xl border py-2 text-center text-xs font-bold transition ${
                  idType === 'passport'
                    ? 'border-ink bg-ink text-bg'
                    : 'border-hairline bg-white text-ink hover:bg-bg'
                }`}
              >
                Passport
              </button>
              <button
                type="button"
                onClick={() => setIdType('license')}
                className={`flex-1 rounded-xl border py-2 text-center text-xs font-bold transition ${
                  idType === 'license'
                    ? 'border-ink bg-ink text-bg'
                    : 'border-hairline bg-white text-ink hover:bg-bg'
                }`}
              >
                Driver's License
              </button>
            </div>

            {governmentIdDoc ? (
              <div className="flex items-center justify-between border border-hairline bg-success/5 p-3 rounded-xl">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-success block truncate">
                    ✓ ID Uploaded
                  </span>
                  <span className="text-[10px] text-muted block mt-0.5 truncate">
                    {governmentIdDoc.storage_path.split('/').pop()}
                  </span>
                </div>
                <button
                  onClick={() => deleteDoc(governmentIdDoc.id, governmentIdDoc.storage_path)}
                  className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                  aria-label="Remove document"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-input-border rounded-xl p-5 bg-white hover:bg-bg/25 cursor-pointer transition">
                <div className="flex flex-col items-center text-center space-y-1">
                  <UploadCloud className="h-8 w-8 text-muted mx-auto" />
                  <span className="text-xs font-bold text-ink">Drag and drop file here, or</span>
                  <span className="mt-1 inline-block rounded-lg bg-ink px-3 py-1.5 text-[10px] font-bold text-white">BROWSE FILES</span>
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('id', file);
                  }}
                  disabled={busy === 'id'}
                />
              </label>
            )}
          </div>
        </Card>

        {/* 2. TAKE A SELFIE */}
        <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-display text-sm font-bold text-ink">2. TAKE A SELFIE</h3>
            <p className="text-xs text-muted">Selfie photo must match your Government ID photo.</p>

            {selfieDoc ? (
              <div className="flex items-center justify-between border border-hairline bg-success/5 p-3 rounded-xl">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-success block truncate">
                    ✓ Selfie Uploaded
                  </span>
                  <span className="text-[10px] text-muted block mt-0.5 truncate">
                    {selfieDoc.storage_path.split('/').pop()}
                  </span>
                </div>
                <button
                  onClick={() => deleteDoc(selfieDoc.id, selfieDoc.storage_path)}
                  className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                  aria-label="Remove selfie"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : webcamOpen ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
                  <button
                    type="button"
                    onClick={cancelWebcam}
                    className="rounded-xl border border-white bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-white/90 transition"
                  >
                    Capture Photo
                  </button>
                </div>
              </div>
            ) : localSelfieUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-bg/10 border border-hairline flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={localSelfieUrl}
                    alt="Selfie preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setLocalSelfieBlob(null);
                      setLocalSelfieUrl(null);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-white/80 p-1.5 text-muted hover:bg-danger/20 hover:text-danger transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-center">
                  <Badge tone="success">Selfie Loaded</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startWebcam}
                  className="w-full flex flex-col items-center justify-center border border-hairline rounded-xl p-5 bg-white hover:bg-bg/25 transition cursor-pointer"
                >
                  <Camera className="h-8 w-8 text-muted mx-auto mb-1" />
                  <span className="text-xs font-bold text-ink">OPEN WEBCAM</span>
                </button>
                <div className="text-center text-xs text-muted">or upload from device</div>
                <label className="flex items-center justify-center gap-2 rounded-xl border border-input-border bg-white px-4 py-2.5 text-xs font-bold text-ink cursor-pointer transition hover:bg-bg/25">
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('selfie', file);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Consent check */}
      <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={bgConsent}
            onChange={(e) => setBgConsent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-hairline text-ink focus:ring-ink"
          />
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-ink block">Background Check Authorization</span>
            <span className="text-xs text-muted block">
              I consent to a standard background check as per the Terms of Service.
            </span>
          </div>
        </label>
      </Card>

      {err && <p className="text-xs font-semibold text-danger pl-0.5">{err}</p>}
      {ok && <p className="text-xs font-semibold text-success pl-0.5">{ok}</p>}

      {/* Actions */}
      <div className="pt-2 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/')} disabled={submitting}>
          Back
        </Button>
        
        {/* Desktop submit button */}
        <div className="hidden lg:block">
          <Button onClick={submitForReview} disabled={missingRequired || submitting}>
            {submitting ? 'Submitting…' : 'SUBMIT FOR VERIFICATION'}
          </Button>
        </div>

        {/* Mobile Sticky Bottom CTA */}
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <Button onClick={submitForReview} disabled={missingRequired || submitting} size="block">
            {submitting ? 'Submitting…' : 'SUBMIT DOCUMENTS'}
          </Button>
        </div>
      </div>
    </div>
  );
}
