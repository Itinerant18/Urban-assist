import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ServicesEditor } from '../../../components/services-editor';
import { loadServiceCatalog, stepLabel, ONBOARDING_STEPS } from '../../../lib/provider-data';

export const dynamic = 'force-dynamic';

export default async function ServicesOnboarding() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const catalog = await loadServiceCatalog(db, user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <p className="font-mono-utility text-xs font-semibold uppercase tracking-wider text-muted">
          {stepLabel(ONBOARDING_STEPS.services, 'Services & pricing')}
        </p>
        <h1 className="font-display text-2xl font-bold text-ink">Services &amp; pricing</h1>
        <p className="text-sm text-muted">
          Pick the services you cover. Prices are set by Urban Assist, so you only choose
          what you offer.
        </p>
      </header>
      <ServicesEditor {...catalog} />
    </div>
  );
}
