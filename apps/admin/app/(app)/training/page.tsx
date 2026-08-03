import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, GraduationCap, ChevronRight } from 'lucide-react';
import { Button, Input, Select } from '@urban-assist/ui';
import { requireAdminPermission } from '../../../lib/admin-auth';
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
  SectionHeader,
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

async function toggleGating(formData: FormData) {
  'use server';
  const { db, user, roles } = await requireAdminPermission('can_manage_providers');
  const itemId = String(formData.get('item_id') ?? '');
  const next = String(formData.get('gates_category')) === 'true';
  if (!itemId) return;

  const adminDb = db as any;
  const { error } = await adminDb
    .from('training_items')
    .update({ gates_category: next })
    .eq('id', itemId);
  if (error) return;

  await adminDb.rpc('append_admin_action_log', {
    p_actor_user_id: user.id,
    p_actor_role_code: roles[0] ?? null,
    p_action_type: 'TRAINING_GATING_TOGGLE',
    p_entity_type: 'training_item',
    p_entity_id: itemId,
    p_context: { gates_category: next },
  });
  revalidatePath('/training');
}

export default async function AdminTrainingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = readTrainingFilters(searchParams);
  const { rows, categories, stats, alerts } = await listAdminTrainingCompliance(filters);

  // All category-scoped modules, gated or not — the toggle works both ways.
  const { db: gatingDb } = await requireAdminPermission('can_manage_providers');
  const { data: gatingItems } = await (gatingDb as any)
    .from('training_items')
    .select('id, title, gates_category, pass_score, category:service_categories(name)')
    .eq('is_active', true)
    .not('category_id', 'is', null)
    .order('title');

  return (
    <div>
      <PageHeader
        title="Training compliance"
        subtitle="Partners × offered categories with gating modules. Scoped to services each provider actually offers."
      />

      {alerts.length > 0 ? (
        <BentoTile static className="mb-6 !justify-start">
          <SectionHeader title="Quality alerts" />
          <ul className="mt-3 -mx-1 divide-y divide-hairline">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={alert.href}
                  className="flex min-h-[44px] items-center gap-3 px-1 py-3 transition-colors hover:bg-bg/60"
                >
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${
                      alert.severity === 'danger' ? 'text-danger' : 'text-accent'
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{alert.title}</p>
                    <p className="truncate text-[11px] text-muted">{alert.detail}</p>
                  </div>
                  <StatusChip tone={alert.severity === 'danger' ? 'danger' : 'pending'}>
                    {alert.count}
                  </StatusChip>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </BentoTile>
      ) : null}

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
              className="whitespace-nowrap rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-bg"
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
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_4.5rem_6rem_7rem_1.5rem] gap-3 border-b border-hairline px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted sm:grid">
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

          <div className="hidden divide-y divide-hairline sm:block">
            {rows.map((row) => (
              <Link
                key={`${row.providerId}:${row.categoryId}`}
                href={`/providers/${row.providerId}/training`}
                className="grid min-h-[44px] grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_4.5rem_6rem_7rem_1.5rem] items-center gap-3 px-5 py-3 transition-colors hover:bg-bg/60"
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
                <p className="truncate font-mono text-[11px] text-muted">
                  {formatUpdated(row.updatedAt)}
                </p>
                <ChevronRight className="h-4 w-4 justify-self-end text-muted" aria-hidden />
              </Link>
            ))}
          </div>
        </TableTile>
      )}

      {(gatingItems ?? []).length > 0 && (
        <BentoTile static className="mt-6 !justify-start">
          <SectionHeader title="Gating modules" />
          <p className="mt-1 text-xs text-muted">
            Gated modules must be passed before a provider receives offers in their category.
            Changes apply to matching immediately.
          </p>
          <ul className="mt-3 -mx-1 divide-y divide-hairline">
            {(gatingItems ?? []).map((item: any) => (
              <li
                key={item.id}
                className="flex min-h-[44px] items-center justify-between gap-3 px-1 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  <p className="text-[11px] text-muted">
                    {item.category?.name ?? 'Category'}
                    {item.pass_score != null ? ` · pass ≥ ${item.pass_score}%` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusChip tone={item.gates_category ? 'success' : 'pending'}>
                    {item.gates_category ? 'Gating' : 'Optional'}
                  </StatusChip>
                  <form action={toggleGating}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <input
                      type="hidden"
                      name="gates_category"
                      value={item.gates_category ? 'false' : 'true'}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      {item.gates_category ? 'Make optional' : 'Make gating'}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </BentoTile>
      )}
    </div>
  );
}
