import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { getProviderKyc } from '@urban-assist/domain';
import { ChevronLeft } from 'lucide-react';
import { ReviewActions } from './review-actions';

export const dynamic = 'force-dynamic';

export default async function KYCReviewDetail({ params }: { params: { providerId: string } }) {
  const db = getSupabaseServer();
  
  // 1. Fetch provider details & documents using domain service
  let kycData;
  try {
    kycData = await getProviderKyc(db, params.providerId);
  } catch (e) {
    notFound();
  }

  const { profile, documents } = kycData;
  if (!profile) notFound();

  // 2. Fetch all other pending KYC providers for the left-hand sidebar queue
  const { data: queue } = await db
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'provider')
    .eq('kyc_status', 'pending')
    .order('created_at', { ascending: false });

  // 3. Generate signed URLs for documents to display in browser
  const documentsWithUrls = await Promise.all((documents || []).map(async (doc: any) => {
    const { data: signData } = await db.storage
      .from('provider_documents')
      .createSignedUrl(doc.storage_path, 3600);
    return {
      ...doc,
      signedUrl: signData?.signedUrl || null,
    };
  }));

  return (
    <div className="h-full flex flex-col -mx-4 lg:-mx-8 -my-6">
      {/* Mobile back link */}
      <div className="lg:hidden bg-white border-b border-hairline p-4 flex items-center gap-3">
        <Link href="/kyc" className="text-ink">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-bold text-ink text-sm">KYC: {profile.full_name}</h1>
          <p className="text-[10px] text-muted">{profile.email}</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Desktop Verification Queue List */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-hairline bg-white">
          <div className="p-4 border-b border-hairline bg-bg/20">
            <h2 className="font-bold text-ink text-sm">Pending KYC Queue ({queue?.length ?? 0})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {queue?.map((q) => (
              <Link
                key={q.id}
                href={`/kyc/${q.id}`}
                className={`block p-3 rounded-xl transition ${
                  q.id === profile.id
                    ? 'bg-ink text-bg font-semibold'
                    : 'text-ink hover:bg-hairline/30'
                }`}
              >
                <div className="text-xs truncate">{q.full_name || 'Unnamed'}</div>
                <div className={`text-[10px] truncate ${q.id === profile.id ? 'text-bg/85' : 'text-muted'}`}>
                  {q.email}
                </div>
              </Link>
            ))}
          </div>
        </aside>

        {/* Center Panel: High Resolution Document Preview */}
        <main className="flex-1 flex flex-col bg-bg/50 relative overflow-hidden">
          <ReviewActions
            providerId={profile.id}
            documents={documentsWithUrls}
            profileName={profile.full_name}
            profileEmail={profile.email}
          />
        </main>
      </div>
    </div>
  );
}
