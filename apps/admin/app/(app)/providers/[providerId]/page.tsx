import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileCheck2 } from 'lucide-react';

import { getAdminProviderDetail } from '../../../../lib/admin-providers';
import { ProviderOperations } from './provider-operations';
import {
  PageHeader,
  BentoGrid,
  BentoTile,
  StatTile,
  SectionHeader,
  StatusChip,
  statusToneFrom,
  TableTile,
  BentoEmpty,
} from '@/components/bento';

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
    <div>
      <div className="mb-2">
        <Link href="/providers" className="text-xs text-muted hover:text-ink transition-colors">
          ← Back to Providers
        </Link>
      </div>

      <PageHeader
        title={profile.full_name || 'Unnamed provider'}
        subtitle={`${profile.email ?? 'No email'} · ${profile.phone || 'No phone'} · Last seen ${profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString('en-GB') : 'never'}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={profile.is_blocked ? 'danger' : 'success'}>
              {profile.is_blocked ? 'Blocked' : 'Active'}
            </StatusChip>
            <StatusChip tone={statusToneFrom(profile.kyc_status)}>
              KYC: {profile.kyc_status}
            </StatusChip>
            <Link
              href={`/kyc/${profile.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-bg transition-colors"
            >
              <FileCheck2 className="h-4 w-4 text-muted" aria-hidden />
              Review docs ({documents.length})
            </Link>
          </div>
        }
      />

      <BentoGrid className="mb-6">
        <StatTile
          label="Completed"
          value={String(metrics.completedJobs)}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Rating"
          value={`★ ${metrics.averageRating.toFixed(2)}`}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Cancellation"
          value={`${(metrics.cancellationRate * 100).toFixed(1)}%`}
          deltaTone={metrics.cancellationRate > 0.15 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          accent
          label="Revenue"
          value={money(metrics.revenueGeneratedPence)}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Disputes"
          value={String(metrics.disputesCount)}
          deltaTone={metrics.disputesCount > 0 ? 'danger' : 'muted'}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
        <StatTile
          label="Repeat customers"
          value={`${(metrics.repeatCustomerRate * 100).toFixed(1)}%`}
          className="col-span-1 md:col-span-2 lg:col-span-2"
        />
      </BentoGrid>

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
          <BentoTile static className="!justify-start">
            <SectionHeader title="Configured services" />
            {services.length === 0 ? (
              <BentoEmpty message="No services configured." className="py-4" />
            ) : (
              <TableTile>
                {services.map((service: any) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 min-h-[40px]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-xs truncate">
                        {service.category?.name ?? service.title}
                      </p>
                      <p className="text-[11px] text-muted font-mono">
                        {service.duration_mins} min · {money(service.price_pence)}
                      </p>
                    </div>
                    <StatusChip tone={service.is_active ? 'success' : 'pending'}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </StatusChip>
                  </div>
                ))}
              </TableTile>
            )}
          </BentoTile>

          <BentoTile static className="!justify-start">
            <SectionHeader title="Internal notes" />
            {notes.length === 0 ? (
              <BentoEmpty message="No internal notes." className="py-4" />
            ) : (
              <div className="space-y-3">
                {notes.map((note: any) => (
                  <div key={note.id} className="border-l-2 border-hairline pl-3 py-1">
                    <p className="whitespace-pre-wrap text-xs text-ink">{note.note}</p>
                    <p className="mt-1 text-[10px] text-muted font-mono">
                      {note.admin?.full_name || note.admin?.email || 'Admin'} ·{' '}
                      {new Date(note.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </BentoTile>
        </aside>
      </div>
    </div>
  );
}

