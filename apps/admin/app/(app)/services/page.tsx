import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { LayoutGrid, ChevronRight, Plus } from 'lucide-react';
import { Button, Input } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { PageHeader, TableTile, SectionHeader, BentoEmpty } from '@/components/bento';

export const dynamic = 'force-dynamic';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function createSubcategory(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_bookings');
  const category_id = String(formData.get('category_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!category_id || !name) return;
  const slug = slugify(name);

  const { data: inserted } = await (db as any)
    .from('service_subcategories')
    .insert({ category_id, slug, name })
    .select('id')
    .single();
  if (inserted) {
    await (db as any).rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: null,
      p_action_type: 'SUBCATEGORY_CREATE',
      p_entity_type: 'service_subcategory',
      p_entity_id: inserted.id,
      p_context: { category_id, name, slug },
    });
  }
  revalidatePath('/services');
}

export default async function ServicesPage() {
  const { db } = await requireAdminPermission('can_manage_bookings');
  const [{ data: categories }, { data: subs }, { data: skus }] = await Promise.all([
    (db as any).from('service_categories').select('id, name').order('sort_order').order('name'),
    (db as any)
      .from('service_subcategories')
      .select('id, category_id, name, slug')
      .order('sort_order')
      .order('name'),
    (db as any).from('service_skus').select('id, subcategory_id'),
  ]);

  const subsByCategory = new Map<string, any[]>();
  for (const s of subs ?? []) {
    (subsByCategory.get(s.category_id) ?? subsByCategory.set(s.category_id, []).get(s.category_id))!.push(
      s,
    );
  }
  const skuCount = new Map<string, number>();
  for (const k of skus ?? []) skuCount.set(k.subcategory_id, (skuCount.get(k.subcategory_id) ?? 0) + 1);

  return (
    <div>
      <PageHeader
        title="Services Catalog"
        subtitle={`${subs?.length ?? 0} subcategories · ${skus?.length ?? 0} services across ${categories?.length ?? 0} categories.`}
        action={<LayoutGrid className="h-5 w-5 text-muted" aria-hidden />}
      />

      <div className="flex flex-col gap-6">
        {(categories ?? []).map((cat: any) => {
          const catSubs = subsByCategory.get(cat.id) ?? [];
          return (
            <section key={cat.id}>
              <SectionHeader title={cat.name} />
              <TableTile>
                {catSubs.length === 0 && (
                  <BentoEmpty message="No subcategories yet." className="py-6" />
                )}
                {catSubs.map((sub: any) => (
                  <Link
                    key={sub.id}
                    href={`/services/${sub.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{sub.name}</p>
                      <p className="text-[11px] text-muted font-mono">{sub.slug}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted">
                        {skuCount.get(sub.id) ?? 0} services
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                    </div>
                  </Link>
                ))}
                <form action={createSubcategory} className="flex items-center gap-2 px-5 py-3">
                  <input type="hidden" name="category_id" value={cat.id} />
                  <Input
                    name="name"
                    required
                    placeholder="New subcategory name"
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" className="font-semibold">
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Add
                  </Button>
                </form>
              </TableTile>
            </section>
          );
        })}
      </div>
    </div>
  );
}
