import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Circle } from 'lucide-react';
import { getAdminProviderTrainingDetail } from '../../../../../lib/admin-training';
import {
  PageHeader,
  TableTile,
  StatusChip,
  BentoEmpty,
  SectionHeader,
  BentoTile,
  BentoGrid,
  StatTile,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

function pctLabel(rate: number | null) {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

export default async function AdminProviderTrainingPage({
  params,
}: {
  params: { providerId: string };
}) {
  let data;
  try {
    data = await getAdminProviderTrainingDetail(params.providerId);
  } catch {
    notFound();
  }

  const { profile, modules, compliance } = data;
  const missing = modules.filter((m) => m.gatesCategory && !m.completedAt).length;
  const incompleteCats = compliance.filter((c) => !c.isEligible).length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs">
        <Link href="/training" className="text-muted hover:text-ink transition-colors">
          ← Training compliance
        </Link>
        <Link
          href={`/providers/${profile.id}`}
          className="text-muted hover:text-ink transition-colors"
        >
          Provider profile
        </Link>
      </div>

      <PageHeader
        title={profile.full_name || 'Unnamed provider'}
        subtitle={`${profile.email ?? 'No email'} · training modules for offered categories`}
      />

      <BentoGrid className="mb-6">
        <StatTile
          label="Modules"
          value={String(modules.length)}
          className="col-span-2 md:col-span-2"
        />
        <StatTile
          label="Gating missing"
          value={String(missing)}
          deltaTone={missing > 0 ? 'danger' : 'success'}
          className="col-span-2 md:col-span-2"
        />
        <StatTile
          label="Categories incomplete"
          value={String(incompleteCats)}
          deltaTone={incompleteCats > 0 ? 'danger' : 'muted'}
          className="col-span-2 md:col-span-2"
        />
      </BentoGrid>

      {compliance.length > 0 && (
        <BentoTile static className="mb-6 !justify-start">
          <SectionHeader title="Category eligibility" />
          <TableTile>
            {compliance.map((row) => (
              <div
                key={row.categoryId}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 min-h-[40px]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{row.categoryName}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {row.completedModules}/{row.requiredModules} · {pctLabel(row.completionRate)}
                  </p>
                </div>
                <StatusChip tone={row.isEligible ? 'success' : 'danger'}>
                  {row.isEligible ? 'Eligible' : 'Not eligible'}
                </StatusChip>
              </div>
            ))}
          </TableTile>
        </BentoTile>
      )}

      <SectionHeader title="Modules" className="mb-3" />
      {modules.length === 0 ? (
        <TableTile>
          <BentoEmpty message="No training modules for this provider’s offered categories." />
        </TableTile>
      ) : (
        <TableTile>
          {modules.map((mod) => {
            const done = Boolean(mod.completedAt);
            return (
              <div
                key={mod.id}
                className="flex items-start gap-3 px-5 py-3 min-h-[44px]"
              >
                {done ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-sm font-medium ${done ? 'text-muted line-through' : 'text-ink'}`}
                    >
                      {mod.title}
                    </p>
                    {mod.isMandatory && !done && <StatusChip tone="accent">Required</StatusChip>}
                    {mod.gatesCategory && <StatusChip tone="accent">Gates</StatusChip>}
                    {mod.categoryName && <StatusChip tone="pending">{mod.categoryName}</StatusChip>}
                  </div>
                  {mod.description && (
                    <p className="text-xs text-muted leading-relaxed">{mod.description}</p>
                  )}
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {done
                      ? `Done ${new Date(mod.completedAt!).toLocaleDateString('en-GB')}${
                          mod.score != null ? ` · score ${mod.score}` : ''
                        }`
                      : mod.estimatedMins != null
                        ? `~${mod.estimatedMins} min`
                        : 'Not completed'}
                  </p>
                </div>
              </div>
            );
          })}
        </TableTile>
      )}
    </div>
  );
}
