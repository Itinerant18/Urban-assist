import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { OnboardingClient } from '../../onboarding/onboarding-client';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single();
  const { data: docs } = await db.from('provider_documents').select('*').eq('provider_id', user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-24 lg:pb-10">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-ink">Documents</h1>
        <p className="text-sm text-muted">Your verification documents and KYC status.</p>
      </header>
      <OnboardingClient profile={profile} initialDocs={(docs as any) ?? []} />
    </div>
  );
}
