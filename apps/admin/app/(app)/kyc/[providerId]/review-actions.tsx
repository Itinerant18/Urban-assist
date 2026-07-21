'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ZoomIn, ZoomOut, Check, X, FileText, Download } from 'lucide-react';
import { Button, Card, Field } from '@urban-assist/ui';

interface Doc {
  id: string;
  doc_type: string;
  storage_path: string;
  expires_at: string | null;
  uploaded_at: string;
  signedUrl: string | null;
}

export function ReviewActions({
  providerId,
  documents,
  profileName,
  profileEmail,
}: {
  providerId: string;
  documents: Doc[];
  profileName: string;
  profileEmail: string;
}) {
  const router = useRouter();
  const [activeDocIndex, setActiveDocIndex] = React.useState(0);
  const [zoom, setZoom] = React.useState(1.0);
  const [rejectReason, setRejectReason] = React.useState('Illegible Document');
  const [showRejectForm, setShowRejectForm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activeDoc = documents[activeDocIndex] || null;

  const handleAction = async (action: 'approve' | 'reject' | 'request_documents', reason?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/kyc/${providerId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: reason ?? (action === 'reject' ? rejectReason : undefined),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to complete action');
      }
      router.refresh();
      router.push('/kyc');
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const isPdf = activeDoc?.storage_path?.toLowerCase().endsWith('.pdf') || false;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Center: Document Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-hairline relative">
        {/* Document Selection Tabs if multiple documents exist */}
        {documents.length > 1 && (
          <div className="flex gap-2 p-3 bg-white border-b border-hairline">
            {documents.map((doc, idx) => (
              <button
                key={doc.id}
                onClick={() => {
                  setActiveDocIndex(idx);
                  setZoom(1.0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  idx === activeDocIndex
                    ? 'bg-ink text-bg'
                    : 'bg-bg/40 text-ink hover:bg-bg/70'
                }`}
              >
                {doc.doc_type.replace(/_/g, ' ').toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar with Zoom Controls */}
        <div className="absolute right-4 top-16 z-10 flex items-center gap-1 bg-white/95 shadow-sm border border-hairline rounded-xl p-1.5 backdrop-blur">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="tap p-1.5 hover:bg-hairline/20 rounded-lg text-ink transition"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-ink px-1.5 w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.1))}
            className="tap p-1.5 hover:bg-hairline/20 rounded-lg text-ink transition"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {activeDoc?.signedUrl && (
            <a
              href={activeDoc.signedUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="tap p-1.5 hover:bg-hairline/20 rounded-lg text-ink transition border-l border-hairline ml-1"
              title="Download Document"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Preview Frame */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-bg/10 select-none">
          {activeDoc ? (
            activeDoc.signedUrl ? (
              isPdf ? (
                <div
                  className="w-full h-full max-w-4xl border border-hairline bg-white shadow-md rounded-2xl overflow-hidden transition-transform duration-100"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                >
                  <iframe src={activeDoc.signedUrl} className="w-full h-full border-none" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeDoc.signedUrl}
                  alt="KYC Document Preview"
                  className="max-w-full max-h-[80vh] object-contain shadow-md rounded-xl transition-transform duration-100"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                />
              )
            ) : (
              <div className="text-center p-8 bg-white border border-hairline rounded-2xl max-w-sm">
                <FileText className="h-10 w-10 text-muted mx-auto mb-2" />
                <p className="text-sm font-semibold text-ink">Cannot preview file</p>
                <p className="text-xs text-muted mt-1">Temporary signed URL could not be generated.</p>
              </div>
            )
          ) : (
            <div className="text-center p-8 bg-white border border-hairline rounded-2xl max-w-sm">
              <FileText className="h-10 w-10 text-muted mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink">No documents uploaded</p>
              <p className="text-xs text-muted mt-1">This provider hasn't uploaded any verification files yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Verification actions (Desktop) */}
      <aside className="hidden lg:flex w-80 shrink-0 flex-col bg-white p-6 justify-between overflow-y-auto">
        <div className="space-y-5">
          <div>
            <h2 className="font-display font-bold text-lg text-ink">{profileName}</h2>
            <p className="text-xs text-muted mt-0.5">{profileEmail}</p>
          </div>

          {activeDoc && (
            <Card className="p-4 border border-hairline bg-bg/10 rounded-xl space-y-3">
              <div>
                <span className="text-[10px] text-muted uppercase font-mono-utility">Document Type</span>
                <p className="text-sm font-bold text-ink mt-0.5">{activeDoc.doc_type.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-mono-utility">Uploaded At</span>
                <p className="text-xs text-ink mt-0.5">{new Date(activeDoc.uploaded_at).toLocaleString('en-GB')}</p>
              </div>
              {activeDoc.expires_at && (
                <div>
                  <span className="text-[10px] text-muted uppercase font-mono-utility">Expires At</span>
                  <p className="text-xs text-ink mt-0.5">{new Date(activeDoc.expires_at).toLocaleDateString('en-GB')}</p>
                </div>
              )}
            </Card>
          )}

          {error && <p className="text-xs text-danger font-semibold">{error}</p>}

          {showRejectForm && (
            <div className="border border-hairline p-4 rounded-xl space-y-3 animate-fadeIn bg-danger/5">
              <Field label="Rejection Reason">
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
                >
                  <option>Illegible Document</option>
                  <option>Expired ID</option>
                  <option>Name Mismatch</option>
                  <option>Other</option>
                </select>
              </Field>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={() => handleAction('reject')} disabled={busy}>
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}
        </div>

        {!showRejectForm && (
          <div className="flex flex-col gap-2 pt-4 border-t border-hairline">
            <Button
              variant="ghost"
              onClick={() => {
                const reason = prompt('Which additional or replacement documents are required?');
                if (reason?.trim()) void handleAction('request_documents', reason);
              }}
              disabled={busy}
            >
              Request more documents
            </Button>
            <Button
              variant="outline"
              className="text-danger border-danger/25 hover:border-danger"
              onClick={() => setShowRejectForm(true)}
              disabled={busy || !activeDoc}
            >
              <X className="h-4 w-4 mr-2" /> Reject Document
            </Button>
            <Button variant="primary" onClick={() => handleAction('approve')} disabled={busy || !activeDoc}>
              <Check className="h-4 w-4 mr-2" /> Approve Document
            </Button>
          </div>
        )}
      </aside>

      {/* Sticky split bottom CTA (Mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden flex gap-2">
        <Button
          variant="outline"
          className="flex-1 text-danger border-danger/25 hover:border-danger"
          onClick={() => {
            const reason = prompt('Please select a reason for rejection (Illegible Document, Expired ID, Name Mismatch, Other):', 'Illegible Document');
            if (reason) {
              setRejectReason(reason);
              handleAction('reject');
            }
          }}
          disabled={busy || !activeDoc}
        >
          Reject
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => handleAction('approve')}
          disabled={busy || !activeDoc}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}
