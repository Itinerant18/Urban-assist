import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ServicesEditor } from '../../onboarding/services/services-editor';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  
  const [{ data: categories }, { data: subcategories }, { data: skus }, { data: mine }] = await Promise.all([
    db.from('service_categories').select('*').order('sort_order'),
    db.from('service_subcategories').select('id, category_id, slug, name').order('sort_order'),
    db.from('service_skus').select('id, subcategory_id, slug, name, min_price_pence, max_price_pence, duration_mins').eq('is_active', true).order('sort_order'),
    db.from('provider_services').select('*, service_skus(id, name)').eq('provider_id', user.id),
  ]);
  
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-ink">My Services &amp; Pricing</h1>
        <p className="text-sm text-muted">
          Select the services you offer and set your rates. Prices must sit within each service SKU&apos;s allowed min/max band.
        </p>
      </header>
      <ServicesEditor
        categories={categories ?? []}
        subcategories={subcategories ?? []}
        skus={skus ?? []}
        mine={mine ?? []}
      />
    </div>
  );
}

