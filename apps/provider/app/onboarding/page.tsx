import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Button } from '@urban-assist/ui';
import { OnboardingClient } from './onboarding-client';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Onboarding() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single();
  const { data: docs } = await db.from('provider_documents').select('*').eq('provider_id', user.id);

  const required = ['id', 'selfie'];
  const have = new Set((docs ?? []).map((d) => d.doc_type));
  const missing = required.filter((r) => !have.has(r));

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 pb-24 lg:pb-10">
      <header className="space-y-1">
        <p className="font-mono-utility text-xs font-semibold uppercase tracking-wider text-muted">
          Step 3 of 3: Identity Verification
        </p>
        <h1 className="font-display text-2xl font-bold text-ink">COMPLETE YOUR PROFILE</h1>
        <p className="text-sm text-muted">
          To ensure platform safety, we require a valid Government ID and a selfie.
        </p>
      </header>

      <OnboardingClient profile={profile} initialDocs={docs as any ?? []} />

      {/* Next step card */}
      <Card className="!p-5 space-y-3 bg-white border border-hairline rounded-xl shadow-card">
        <h3 className="font-display font-semibold text-ink">Next step: Services &amp; pricing</h3>
        <p className="text-sm text-charcoal">
          Once your identity and insurance are verified, you can select the service categories you cover and configure your pricing.
        </p>
        {missing.length > 0 ? (
          <Button disabled className="w-full flex items-center justify-center gap-2">
            Complete verification first
          </Button>
        ) : (
          <Link href="/onboarding/services" className="block w-full">
            <Button className="w-full flex items-center justify-center gap-2">
              Set up services <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </Card>
    </div>
  );
}
