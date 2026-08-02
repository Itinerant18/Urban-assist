import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ServicesEditor } from '../../../components/services-editor';
import { loadServiceCatalog } from '../../../lib/provider-data';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const catalog = await loadServiceCatalog(db, user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-ink">My Services &amp; Pricing</h1>
        <p className="text-sm text-muted">
          Choose the services you offer. Prices are set by Urban Assist so customers see
          the same rate everywhere.
        </p>
      </header>
      <ServicesEditor {...catalog} />
    </div>
  );
}
