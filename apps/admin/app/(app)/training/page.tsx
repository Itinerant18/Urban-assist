import Link from 'next/link';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { Button, Input, Select } from '@urban-assist/ui';
import {
  listAdminTrainingCompliance,
  readTrainingFilters,
} from '../../../lib/admin-training';
import {
  PageHeader,
  BentoTile,
  TableTile,
  StatusChip,
  BentoEmpty,
  StatTile,
  BentoGrid,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

function pctLabel(rate: number | null) {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

function formatUpdated(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminTrainingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = readTrainingFilters(searchParams);
  const { rows, categories, stats } = await listAdminTrainingCompliance(filters);

  return (
    <div>
      <PageHeader
        title="Training compliance"
        subtitle="Partners × offered categories with gating modules. Scoped to services each provider actually offers."
      />

      <BentoGrid className="mb-6">
        <StatTile label="Rows" value={String(stats.total)} className="col-span-2 md:col-span-2" />
        <StatTile
          label="Incomplete"
          value={String(stats.incomplete)}
          deltaTone={stats.incomplete > 0 ? 'danger' : 'muted'}
          className="col-span-2 md:col-span-2"
        />
        <StatTile
          label="Eligible"
          value={String(stats.eligible)}
          deltaTone="success"
          className="col-span-2 md:col-span-2"
        />
      </BentoGrid>

      <BentoTile static className="mb-6 !justify-start">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" method="GET">
          <label className="text-xs text-muted xl:col-span-1">
            Search
            <Input
              className="mt-1"
              name="q"
              defaultValue={filters.q ?? ''}
              placeholder="Provider or category"
            />
          </label>
          <label className="text-xs text-muted">
            Category
            <Select className="mt-1" name="category" defaultValue={filters.categoryId ?? ''}>
              <option value="">All gated categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            Eligibility
            <Select className="mt-1" name="eligibility" defaultValue={filters.eligibility ?? ''}>
              <option value="">All</option>
              <option value="eligible">Eligible</option>
              <option value="not_eligible">Not eligible</option>
            </Select>
          </label>
          <label className="text-xs text-muted">
            Threshold
            <Select className="mt-1" name="threshold" defaultValue={filters.threshold ?? ''}>
              <option value="">All</option>
              <option value="incomplete">&lt; 100% complete</option>
              <option value="high_risk_missing">Missing high-risk training</option>
            </Select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full">
              Apply
            </Button>
            <Link
              href="/training"
              className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink hover:bg-bg transition-colors whitespace-nowrap"
            >
              Clear
            </Link>
          </div>
        </form>
      </BentoTile>

      {rows.length === 0 ? (
        <TableTile>
          <BentoEmpty
            icon={GraduationCap}
            message="No training compliance rows match these filters."
          />
        </TableTile>
      ) : (
        <TableTile>
          <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_4.5rem_6rem_7rem_1.5rem] gap-3 border-b border-hairline px-5 py-2 text-[10px] uppercase tracking-wider text-muted font-mono">
            <span>Provider</span>
            <span>Category</span>
            <span>Modules</span>
            <span>%</span>
            <span>Eligibility</span>
            <span>Updated</span>
            <span />
          </div>

          <div className="divide-y divide-hairline sm:hidden">
            {rows.map((row) => (
              <Link
                key={`${row.providerId}:${row.categoryId}`}
                href={`/providers/${row.providerId}/training`}
                className="tap block p-4 hover:bg-bg/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {row.providerName ?? 'Unnamed'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{row.categoryName}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono-utility text-xs text-muted">
                    {row.completedModules}/{row.requiredModules} · {pctLabel(row.completionRate)}
                  </span>
                  <StatusChip tone={row.isEligible ? 'success' : 'danger'}>
                    {row.isEligible ? 'Eligible' : 'Not eligible'}
                  </StatusChip>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden sm:block divide-y divide-hairline">
            {rows.map((row) => (
              <Link
                key={`${row.providerId}:${row.categoryId}`}
                href={`/providers/${row.providerId}/training`}
                className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_4.5rem_6rem_7rem_1.5rem] items-center gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
              >
                <p className="truncate text-sm font-medium text-ink">
                  {row.providerName ?? 'Unnamed'}
                </p>
                <p className="truncate text-sm text-ink">{row.categoryName}</p>
                <p className="font-mono text-xs text-muted">
                  {row.completedModules}/{row.requiredModules}
                </p>
                <p className="font-mono text-xs text-ink">{pctLabel(row.completionRate)}</p>
                <StatusChip tone={row.isEligible ? 'success' : 'danger'}>
                  {row.isEligible ? 'Eligible' : 'Not eligible'}
                </StatusChip>
                <p className="font-mono text-[11px] text-muted truncate">
                  {formatUpdated(row.updatedAt)}
                </p>
                <ChevronRight className="h-4 w-4 text-muted justify-self-end" aria-hidden />
              </Link>
            ))}
          </div>
        </TableTile>
      )}
    </div>
  );
}
