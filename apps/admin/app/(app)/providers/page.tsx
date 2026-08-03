import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { Button, Input, Select } from '@urban-assist/ui';

import {
  listAdminProviders,
  readProviderFilters,
} from '../../../lib/admin-providers';
import {
  PageHeader,
  BentoTile,
  TableTile,
  StatusChip,
  statusToneFrom,
  BentoEmpty,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = readProviderFilters(searchParams);
  const { providers, categories, count } = await listAdminProviders(filters);
  const onlineCount = providers.filter((provider) => provider.is_online).length;
  const hasFilters = Boolean(
    filters.kyc ||
      filters.categoryId ||
      filters.training ||
      filters.postcode ||
      filters.city,
  );

  return (
    <div>
      <PageHeader
        title="Providers"
        subtitle={
          hasFilters
            ? `${count} match · ${onlineCount} online in this view.`
            : `${count} registered · ${onlineCount} online now.`
        }
      />

      <BentoTile static className="mb-6 !justify-start">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" method="GET">
          <label className="text-xs text-muted">
            KYC
            <Select className="mt-1" name="kyc" defaultValue={filters.kyc ?? ''}>
              <option value="">All KYC statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
          </label>
          <label className="text-xs text-muted">
            Category
            <Select className="mt-1" name="category" defaultValue={filters.categoryId ?? ''}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            Training
            <Select className="mt-1" name="training" defaultValue={filters.training ?? ''}>
              <option value="">All training</option>
              <option value="incomplete">Incomplete (gated)</option>
              <option value="eligible">Eligible</option>
            </Select>
          </label>
          <label className="text-xs text-muted">
            City
            <Input
              className="mt-1"
              name="city"
              defaultValue={filters.city ?? ''}
              placeholder="London"
            />
          </label>
          <label className="text-xs text-muted">
            Coverage postcode
            <Input
              className="mt-1 uppercase"
              name="postcode"
              defaultValue={filters.postcode ?? ''}
              placeholder="SW1"
            />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="font-semibold">
              Apply filters
            </Button>
            <Link
              className="rounded-xl border border-hairline bg-white px-4 py-2 text-sm text-ink transition-colors hover:bg-bg"
              href="/providers"
            >
              Reset
            </Link>
          </div>
        </form>
      </BentoTile>

      {providers.length === 0 ? (
        <TableTile>
          <BentoEmpty
            icon={Users}
            message={hasFilters ? 'No providers match these filters.' : 'No providers registered yet.'}
          />
        </TableTile>
      ) : (
        <TableTile>
          <div className="divide-y divide-hairline sm:hidden">
            {providers.map((p) => (
              <Link key={p.id} href={`/providers/${p.id}`} className="tap block p-4 hover:bg-bg/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{p.full_name ?? 'Unnamed'}</p>
                    <p className="mt-1 truncate font-mono-utility text-xs text-muted">{p.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusChip tone={statusToneFrom(p.kyc_status)}>{p.kyc_status}</StatusChip>
                  {p.is_online ? <StatusChip tone="success">Online</StatusChip> : null}
                  {p.is_blocked ? <StatusChip tone="danger">Blocked</StatusChip> : null}
                  {p.training_incomplete ? (
                    <StatusChip tone="danger">Training incomplete</StatusChip>
                  ) : null}
                  <span className="font-mono-utility text-xs text-muted">
                    ★ {Number(p.rating_avg ?? 0).toFixed(1)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden divide-y divide-hairline sm:block">
            {providers.map((p) => (
              <Link
                key={p.id}
                href={`/providers/${p.id}`}
                className="flex min-h-[44px] items-center gap-3 px-5 py-3 transition-colors hover:bg-bg/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.full_name ?? 'Unnamed'}</p>
                  <p className="truncate font-mono text-xs text-muted">{p.email}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StatusChip tone={statusToneFrom(p.kyc_status)}>{p.kyc_status}</StatusChip>
                  {p.is_online ? <StatusChip tone="success">Online</StatusChip> : null}
                  {p.is_blocked ? <StatusChip tone="danger">Blocked</StatusChip> : null}
                  {p.training_incomplete ? (
                    <StatusChip tone="danger">Training incomplete</StatusChip>
                  ) : null}
                  <span className="font-mono text-xs text-muted">
                    ★ {Number(p.rating_avg ?? 0).toFixed(1)}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </Link>
            ))}
          </div>
        </TableTile>
      )}
    </div>
  );
}
