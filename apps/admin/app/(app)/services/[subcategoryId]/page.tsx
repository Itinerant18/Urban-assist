import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button, Input } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toPence = (v: FormDataEntryValue | null) => Math.round(Number(v ?? 0) * 100);

async function audit(db: any, userId: string, action: string, id: string | null, ctx: any) {
  await db.rpc('append_admin_action_log', {
    p_actor_user_id: userId,
    p_actor_role_code: null,
    p_action_type: action,
    p_entity_type: 'service_sku',
    p_entity_id: id,
    p_context: ctx,
  });
}

async function createSku(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_bookings');
  const subcategory_id = String(formData.get('subcategory_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!subcategory_id || !name) return;
  const { data: inserted } = await (db as any)
    .from('service_skus')
    .insert({
      subcategory_id,
      slug: slugify(name),
      name,
      min_price_pence: toPence(formData.get('min')),
      max_price_pence: toPence(formData.get('max')),
      duration_mins: formData.get('duration') ? Number(formData.get('duration')) : null,
    })
    .select('id')
    .single();
  if (inserted) await audit(db, user.id, 'SKU_CREATE', inserted.id, { subcategory_id, name });
  revalidatePath(`/services/${subcategory_id}`);
}

async function updateSku(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_bookings');
  const id = String(formData.get('id') ?? '');
  const subcategory_id = String(formData.get('subcategory_id') ?? '');
  if (!id) return;
  const patch = {
    min_price_pence: toPence(formData.get('min')),
    max_price_pence: toPence(formData.get('max')),
    duration_mins: formData.get('duration') ? Number(formData.get('duration')) : null,
    is_popular: formData.get('is_popular') === 'on',
    is_active: formData.get('is_active') === 'on',
  };
  await (db as any).from('service_skus').update(patch).eq('id', id);
  await audit(db, user.id, 'SKU_UPDATE', id, patch);
  revalidatePath(`/services/${subcategory_id}`);
}

export default async function SubcategoryDetailPage({
  params,
}: {
  params: { subcategoryId: string };
}) {
  const { db } = await requireAdminPermission('can_manage_bookings');

  const { data: sub } = await (db as any)
    .from('service_subcategories')
    .select('id, name, slug, category:service_categories(name)')
    .eq('id', params.subcategoryId)
    .maybeSingle();
  if (!sub) notFound();

  const { data: skuRows } = await (db as any)
    .from('service_skus')
    .select('id, name, slug, min_price_pence, max_price_pence, duration_mins, is_popular, is_active')
    .eq('subcategory_id', params.subcategoryId)
    .order('sort_order')
    .order('name');
  const skus = skuRows ?? [];
  const gbp = (p: number) => (p / 100).toFixed(2);

  return (
    <div className="max-w-3xl">
      <Link href="/services" className="inline-flex items-center gap-1.5 text-sm text-muted mb-6 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Catalog
      </Link>

      <div className="mb-6">
        <p className="text-xs text-muted">{sub.category?.name}</p>
        <h1 className="font-display text-2xl font-bold text-ink">{sub.name}</h1>
        <p className="text-[11px] text-muted font-mono mt-0.5">{sub.slug} · {skus.length} services</p>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        {skus.map((s: any) => (
          <form
            key={s.id}
            action={updateSku}
            className={`rounded-2xl border border-hairline bg-white p-4 ${s.is_active ? '' : 'opacity-60'}`}
          >
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="subcategory_id" value={params.subcategoryId} />
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-ink">{s.name}</p>
              <p className="text-[11px] text-muted font-mono">{s.slug}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-muted">
                Min £
                <Input name="min" type="number" min="0" step="0.01" defaultValue={gbp(s.min_price_pence)} className="mt-1 w-24" />
              </label>
              <label className="text-xs text-muted">
                Max £
                <Input name="max" type="number" min="0" step="0.01" defaultValue={gbp(s.max_price_pence)} className="mt-1 w-24" />
              </label>
              <label className="text-xs text-muted">
                Mins
                <Input name="duration" type="number" min="0" defaultValue={s.duration_mins ?? ''} className="mt-1 w-20" />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink">
                <input name="is_popular" type="checkbox" defaultChecked={s.is_popular} className="h-4 w-4 rounded border-hairline" /> Popular
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink">
                <input name="is_active" type="checkbox" defaultChecked={s.is_active} className="h-4 w-4 rounded border-hairline" /> Active
              </label>
              <Button type="submit" variant="outline" size="sm" className="ml-auto">
                Save
              </Button>
            </div>
          </form>
        ))}
      </div>

      <h2 className="font-display text-sm font-bold text-ink mb-2">Add service</h2>
      <form action={createSku} className="card flex flex-wrap items-end gap-3">
        <input type="hidden" name="subcategory_id" value={params.subcategoryId} />
        <label className="text-xs text-muted flex-1 min-w-[160px]">
          Name
          <Input name="name" required placeholder="e.g. Oven Cleaning" className="mt-1" />
        </label>
        <label className="text-xs text-muted">
          Min £
          <Input name="min" type="number" min="0" step="0.01" defaultValue="0" className="mt-1 w-24" />
        </label>
        <label className="text-xs text-muted">
          Max £
          <Input name="max" type="number" min="0" step="0.01" defaultValue="0" className="mt-1 w-24" />
        </label>
        <label className="text-xs text-muted">
          Mins
          <Input name="duration" type="number" min="0" className="mt-1 w-20" />
        </label>
        <Button type="submit" size="sm" className="font-semibold">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
    </div>
  );
}
