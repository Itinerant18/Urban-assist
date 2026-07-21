import { revalidatePath } from 'next/cache';
import { Percent } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

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
    <form action={setCommission} className="card flex items-center justify-between gap-3">
      <input type="hidden" name="category_id" value={id} />
      <span className="text-sm text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          name="percent"
          type="number"
          min="0"
          max="100"
          step="0.5"
          defaultValue={pct(bps)}
          className="w-20 rounded-lg border border-hairline bg-bg px-2 py-1.5 text-sm text-ink text-right focus:border-ink focus:outline-none"
        />
        <span className="text-xs text-muted">%</span>
        <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">
          Save
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Percent className="h-5 w-5 text-muted" />
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Pricing &amp; Commission</h1>
          <p className="text-sm text-muted mt-1">Platform commission taken from each completed booking&apos;s net price.</p>
        </div>
      </div>

      <h2 className="font-display text-sm font-bold text-ink mb-2">Default rate</h2>
      <div className="mb-6">
        <Row id="default" label="All categories (default)" bps={defaultBps} />
      </div>

      <h2 className="font-display text-sm font-bold text-ink mb-2">Per-category overrides</h2>
      <div className="flex flex-col gap-2">
        {(categories ?? []).map((c: any) => (
          <Row key={c.id} id={c.id} label={c.name} bps={bpsByCategory.get(c.id) ?? defaultBps} />
        ))}
      </div>
    </div>
  );
}
