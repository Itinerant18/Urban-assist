import { revalidatePath } from 'next/cache';
import { Percent } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { PageHeader, SectionHeader, BentoTile, TableTile } from '@/components/bento';

export const dynamic = 'force-dynamic';

async function setCommission(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_payments');
  const categoryId = String(formData.get('category_id') ?? '');
  const percent = Number(formData.get('percent'));
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return;
  const rate_bps = Math.round(percent * 100);

  if (categoryId === 'default') {
    await (db as any).from('commission_rules').update({ rate_bps, updated_at: new Date().toISOString() }).is('category_id', null);
  } else {
    await (db as any)
      .from('commission_rules')
      .upsert({ category_id: categoryId, rate_bps, updated_at: new Date().toISOString() }, { onConflict: 'category_id' });
  }
  await (db as any).rpc('append_admin_action_log', {
    p_actor_user_id: user.id,
    p_actor_role_code: null,
    p_action_type: 'COMMISSION_SET',
    p_entity_type: 'commission',
    p_entity_id: categoryId === 'default' ? null : categoryId,
    p_context: { category_id: categoryId, rate_bps },
  });
  revalidatePath('/pricing');
}

export default async function PricingPage() {
  const { db } = await requireAdminPermission('can_manage_payments');
  const [{ data: categories }, { data: rules }] = await Promise.all([
    (db as any).from('service_categories').select('id, name').order('name'),
    (db as any).from('commission_rules').select('category_id, rate_bps'),
  ]);
  const bpsByCategory = new Map<string | null, number>(
    (rules ?? []).map((r: any) => [r.category_id, r.rate_bps]),
  );
  const defaultBps = bpsByCategory.get(null) ?? 0;
  const pct = (bps: number) => (bps / 100).toString();

  const Row = ({ id, label, bps }: { id: string; label: string; bps: number }) => (
    <form action={setCommission} className="flex items-center justify-between gap-3 px-5 py-3 min-h-[44px]">
      <input type="hidden" name="category_id" value={id} />
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          name="percent"
          type="number"
          min="0"
          max="100"
          step="0.5"
          defaultValue={pct(bps)}
          className="w-20 rounded-xl border border-hairline bg-bg px-3 py-1.5 text-sm text-ink text-right focus:border-accent focus:outline-none"
        />
        <span className="text-xs text-muted">%</span>
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Save
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Pricing & Commission"
        subtitle="Platform commission taken from each completed booking's net price."
        action={<Percent className="h-5 w-5 text-muted" aria-hidden />}
      />

      <div className="mb-6">
        <SectionHeader title="Default rate" />
        <TableTile>
          <Row id="default" label="All categories (default)" bps={defaultBps} />
        </TableTile>
      </div>

      <div>
        <SectionHeader title="Per-category overrides" />
        <TableTile>
          {(categories ?? []).map((c: any) => (
            <Row key={c.id} id={c.id} label={c.name} bps={bpsByCategory.get(c.id) ?? defaultBps} />
          ))}
        </TableTile>
      </div>
    </div>
  );
}

