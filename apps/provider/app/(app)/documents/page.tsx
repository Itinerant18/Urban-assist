import { redirect } from 'next/navigation';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { OnboardingClient } from '../../onboarding/onboarding-client';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const admin = createServiceRole();
  const [{ data: profile }, { data: docs }, { data: adminNote }] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).single(),
    db.from('provider_documents').select('*').eq('provider_id', user.id),
    admin
      .from('provider_admin_notes')
      .select('note, created_at')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const showAdminNote =
    (profile?.kyc_status === 'pending' || profile?.kyc_status === 'rejected') && adminNote?.note;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-24 lg:pb-10">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-ink">Documents</h1>
        <p className="text-sm text-muted">Your verification documents and KYC status.</p>
      </header>
      {showAdminNote && (
        <section className="rounded-xl border border-hairline bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Admin feedback</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{adminNote.note}</p>
        </section>
      )}
      <OnboardingClient profile={profile} initialDocs={(docs as any) ?? []} />
    </div>
  );
}
