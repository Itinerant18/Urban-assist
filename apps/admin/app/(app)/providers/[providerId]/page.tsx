import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, FileCheck2 } from 'lucide-react';

import { getAdminProviderDetail } from '../../../../lib/admin-providers';
import { ProviderOperations } from './provider-operations';

export const dynamic = 'force-dynamic';

function money(pence: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export default async function ProviderDetailPage({ params }: { params: { providerId: string } }) {
  let data;
  try {
    data = await getAdminProviderDetail(params.providerId);
  } catch {
    notFound();
  }
  const { profile, metrics, services, serviceAreas, categories, documents, notes } = data;
  const activeCategoryIds = services
    .filter((service: any) => service.is_active)
    .map((service: any) => service.category_id);

  return (
    <div className="space-y-6">
      <Link href="/providers" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Providers
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink">{profile.full_name || 'Unnamed provider'}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${profile.is_blocked ? 'bg-danger/10 text-danger' : 'bg-green-100 text-green-700'}`}>
              {profile.is_blocked ? 'Blocked' : 'Active'}
            </span>
            <span className="rounded-full bg-hairline/60 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">{profile.kyc_status}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{profile.email} · {profile.phone || 'No phone'}</p>
          <p className="mt-1 text-xs text-muted">Last seen {profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString('en-GB') : 'never'}</p>
        </div>
        <Link href={`/kyc/${profile.id}`} className="btn-secondary inline-flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Review documents ({documents.length})</Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Completed" value={String(metrics.completedJobs)} />
        <Metric label="Rating" value={metrics.averageRating.toFixed(2)} />
        <Metric label="Cancellation" value={`${(metrics.cancellationRate * 100).toFixed(1)}%`} />
        <Metric label="Revenue" value={money(metrics.revenueGeneratedPence)} />
        <Metric label="Disputes" value={String(metrics.disputesCount)} />
        <Metric label="Repeat customers" value={`${(metrics.repeatCustomerRate * 100).toFixed(1)}%`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <ProviderOperations
          providerId={profile.id}
          isBlocked={profile.is_blocked}
          categories={categories}
          selectedCategoryIds={activeCategoryIds}
          initialServiceAreas={serviceAreas}
          canAddNotes={data.canAddNotes}
        />

        <aside className="space-y-6">
          <section className="card">
            <h2 className="font-display text-base font-bold text-ink">Configured services</h2>
            <div className="mt-3 space-y-2">
              {services.length === 0 && <p className="text-xs text-muted">No services configured.</p>}
              {services.map((service: any) => (
                <div key={service.id} className="flex items-center justify-between rounded-lg border border-hairline p-3 text-xs">
                  <div><p className="font-semibold text-ink">{service.category?.name ?? service.title}</p><p className="text-muted">{service.duration_mins} min · {money(service.price_pence)}</p></div>
                  <span className={service.is_active ? 'text-green-700' : 'text-muted'}>{service.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="font-display text-base font-bold text-ink">Internal notes</h2>
            <div className="mt-3 space-y-3">
              {notes.length === 0 && <p className="text-xs text-muted">No internal notes.</p>}
              {notes.map((note: any) => (
                <div key={note.id} className="border-l-2 border-hairline pl-3">
                  <p className="whitespace-pre-wrap text-xs text-ink">{note.note}</p>
                  <p className="mt-1 text-[10px] text-muted">{note.admin?.full_name || note.admin?.email || 'Admin'} · {new Date(note.created_at).toLocaleString('en-GB')}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 font-display text-xl font-bold text-ink">{value}</p></div>;
}
