import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button, Input, Textarea } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../../lib/admin-auth';
import { linesToList, listToLines } from '../../../../lib/admin-service-sku-copy';
import { PageHeader, StatusChip, BentoTile } from '@/components/bento';

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

// A duration of 0 (or negative) makes a booking's tstzrange empty, and an empty range
// overlaps nothing, which silently switched off the whole provider double-booking guard.
// "0" is a truthy string, so the previous `formData.get(...) ? Number(...) : null` let it
// straight through. The database now rejects it too (bookings_duration_positive), but
// coercing to null here avoids surfacing a raw constraint error in the admin UI.
function toDurationMins(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? '').trim());
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.round(n);
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
      description: String(formData.get('description') ?? '').trim() || null,
      min_price_pence: toPence(formData.get('min')),
      max_price_pence: toPence(formData.get('max')),
      duration_mins: toDurationMins(formData.get('duration')),
      inclusions: linesToList(String(formData.get('inclusions') ?? '')),
      exclusions: linesToList(String(formData.get('exclusions') ?? '')),
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
    description: String(formData.get('description') ?? '').trim() || null,
    min_price_pence: toPence(formData.get('min')),
    max_price_pence: toPence(formData.get('max')),
    duration_mins: toDurationMins(formData.get('duration')),
    is_popular: formData.get('is_popular') === 'on',
    is_active: formData.get('is_active') === 'on',
    inclusions: linesToList(String(formData.get('inclusions') ?? '')),
    exclusions: linesToList(String(formData.get('exclusions') ?? '')),
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
    .select('id, name, slug, category_id, category:service_categories(id, name)')
    .eq('id', params.subcategoryId)
    .maybeSingle();
  if (!sub) notFound();

  const category = Array.isArray(sub.category) ? sub.category[0] : sub.category;
  const categoryId = category?.id ?? sub.category_id;

  const [{ data: skuRows }, { count: gatingCount }] = await Promise.all([
    (db as any)
      .from('service_skus')
      .select(
        'id, name, slug, description, min_price_pence, max_price_pence, duration_mins, is_popular, is_active, inclusions, exclusions',
      )
      .eq('subcategory_id', params.subcategoryId)
      .order('sort_order')
      .order('name'),
    categoryId
      ? (db as any)
          .from('training_items')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', categoryId)
          .eq('gates_category', true)
          .eq('is_active', true)
      : Promise.resolve({ count: 0 }),
  ]);

  const skus = skuRows ?? [];
  const gbp = (p: number) => (p / 100).toFixed(2);
  const trainingGated = (gatingCount ?? 0) > 0;

  return (
    <div className="max-w-3xl">
      <Link
        href="/services"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Catalog
      </Link>

      <PageHeader
        title={sub.name}
        subtitle={`${category?.name ?? 'Category'} · ${sub.slug} · ${skus.length} services`}
        action={
          trainingGated ? (
            <Link href={`/training?category=${encodeURIComponent(categoryId)}`}>
              <StatusChip tone="pending">Training gated · {gatingCount} modules</StatusChip>
            </Link>
          ) : (
            <StatusChip tone="success">No training gate</StatusChip>
          )
        }
      />

      <div className="mb-6 flex flex-col gap-4">
        {skus.map((s: any) => (
          <form
            key={s.id}
            action={updateSku}
            className={`rounded-2xl border border-hairline bg-white p-4 ${s.is_active ? '' : 'opacity-60'}`}
          >
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="subcategory_id" value={params.subcategoryId} />
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">{s.name}</p>
              <p className="font-mono text-[11px] text-muted">{s.slug}</p>
            </div>
            <label className="block text-xs text-muted">
              Description
              <Textarea
                name="description"
                rows={2}
                defaultValue={s.description ?? ''}
                className="mt-1"
                placeholder="Short customer-facing summary"
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted">
                Inclusions (one per line)
                <Textarea
                  name="inclusions"
                  rows={4}
                  defaultValue={listToLines(s.inclusions)}
                  className="mt-1"
                  placeholder="Dust surfaces&#10;Vacuum floors"
                />
              </label>
              <label className="block text-xs text-muted">
                Exclusions (one per line)
                <Textarea
                  name="exclusions"
                  rows={4}
                  defaultValue={listToLines(s.exclusions)}
                  className="mt-1"
                  placeholder="Exterior windows&#10;Laundry"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs text-muted">
                Min £
                <Input
                  name="min"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={gbp(s.min_price_pence)}
                  className="mt-1 w-24"
                />
              </label>
              <label className="text-xs text-muted">
                Max £
                <Input
                  name="max"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={gbp(s.max_price_pence)}
                  className="mt-1 w-24"
                />
              </label>
              <label className="text-xs text-muted">
                Mins
                <Input
                  name="duration"
                  type="number"
                  min="1"
                  defaultValue={s.duration_mins ?? ''}
                  className="mt-1 w-20"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink">
                <input
                  name="is_popular"
                  type="checkbox"
                  defaultChecked={s.is_popular}
                  className="h-4 w-4 rounded border-hairline"
                />{' '}
                Popular
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={s.is_active}
                  className="h-4 w-4 rounded border-hairline"
                />{' '}
                Active
              </label>
              <Button type="submit" variant="outline" size="sm" className="ml-auto">
                Save
              </Button>
            </div>
          </form>
        ))}
      </div>

      <BentoTile static className="!justify-start">
        <h2 className="mb-3 font-display text-sm font-bold text-ink">Add service</h2>
        <form action={createSku} className="flex flex-col gap-3">
          <input type="hidden" name="subcategory_id" value={params.subcategoryId} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[160px] flex-1 text-xs text-muted">
              Name
              <Input name="name" required placeholder="e.g. Oven Cleaning" className="mt-1" />
            </label>
            <label className="text-xs text-muted">
              Min £
              <Input
                name="min"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className="mt-1 w-24"
              />
            </label>
            <label className="text-xs text-muted">
              Max £
              <Input
                name="max"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className="mt-1 w-24"
              />
            </label>
            <label className="text-xs text-muted">
              Mins
              <Input name="duration" type="number" min="1" className="mt-1 w-20" />
            </label>
          </div>
          <label className="block text-xs text-muted">
            Description
            <Textarea name="description" rows={2} className="mt-1" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              Inclusions (one per line)
              <Textarea name="inclusions" rows={3} className="mt-1" />
            </label>
            <label className="block text-xs text-muted">
              Exclusions (one per line)
              <Textarea name="exclusions" rows={3} className="mt-1" />
            </label>
          </div>
          <Button type="submit" size="sm" className="w-fit font-semibold">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </form>
      </BentoTile>
    </div>
  );
}
