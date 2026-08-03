import { revalidatePath } from 'next/cache';
import { Percent, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../lib/admin-auth';
import { normalizePostcodePrefix } from '@urban-assist/domain/pricing';
import { PageHeader, SectionHeader, TableTile, BentoTile, StatusChip } from '@/components/bento';

export const dynamic = 'force-dynamic';

async function setCommission(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_payments');
  const categoryId = String(formData.get('category_id') ?? '');
  const percent = Number(formData.get('percent'));
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return;
  const rate_bps = Math.round(percent * 100);

  if (categoryId === 'default') {
    await (db as any)
      .from('commission_rules')
      .update({ rate_bps, updated_at: new Date().toISOString() })
      .is('category_id', null);
  } else {
    await (db as any)
      .from('commission_rules')
      .upsert(
        { category_id: categoryId, rate_bps, updated_at: new Date().toISOString() },
        { onConflict: 'category_id' },
      );
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

async function createModifier(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_payments');
  const label = String(formData.get('label') ?? '').trim();
  const adjustment = Number(formData.get('adjustment_percent'));
  if (!label || !Number.isFinite(adjustment) || adjustment < -50 || adjustment > 100) return;

  const postcodeRaw = String(formData.get('postcode_prefix') ?? '').trim();
  const postcode_prefix = postcodeRaw ? normalizePostcodePrefix(postcodeRaw) : null;

  const startRaw = String(formData.get('start_hour') ?? '').trim();
  const endRaw = String(formData.get('end_hour') ?? '').trim();
  let start_hour: number | null = startRaw === '' ? null : Number(startRaw);
  let end_hour: number | null = endRaw === '' ? null : Number(endRaw);
  if (start_hour == null || end_hour == null) {
    start_hour = null;
    end_hour = null;
  } else if (
    !Number.isInteger(start_hour) ||
    !Number.isInteger(end_hour) ||
    start_hour < 0 ||
    start_hour > 23 ||
    end_hour < 0 ||
    end_hour > 23
  ) {
    return;
  }

  const categoryRaw = String(formData.get('category_id') ?? '').trim();
  const category_id = categoryRaw || null;

  const { data: inserted } = await (db as any)
    .from('pricing_modifiers')
    .insert({
      label,
      postcode_prefix,
      start_hour,
      end_hour,
      category_id,
      adjustment_percent: adjustment,
      is_active: true,
    })
    .select('id')
    .single();

  if (inserted) {
    await (db as any).rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: null,
      p_action_type: 'PRICING_MODIFIER_CREATE',
      p_entity_type: 'pricing_modifier',
      p_entity_id: inserted.id,
      p_context: { label, postcode_prefix, start_hour, end_hour, category_id, adjustment },
    });
  }
  revalidatePath('/pricing');
}

async function toggleModifier(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_payments');
  const id = String(formData.get('id') ?? '');
  const next = formData.get('is_active') === 'true';
  if (!id) return;
  await (db as any)
    .from('pricing_modifiers')
    .update({ is_active: next, updated_at: new Date().toISOString() })
    .eq('id', id);
  await (db as any).rpc('append_admin_action_log', {
    p_actor_user_id: user.id,
    p_actor_role_code: null,
    p_action_type: 'PRICING_MODIFIER_TOGGLE',
    p_entity_type: 'pricing_modifier',
    p_entity_id: id,
    p_context: { is_active: next },
  });
  revalidatePath('/pricing');
}

async function deleteModifier(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_payments');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await (db as any).from('pricing_modifiers').delete().eq('id', id);
  await (db as any).rpc('append_admin_action_log', {
    p_actor_user_id: user.id,
    p_actor_role_code: null,
    p_action_type: 'PRICING_MODIFIER_DELETE',
    p_entity_type: 'pricing_modifier',
    p_entity_id: id,
    p_context: {},
  });
  revalidatePath('/pricing');
}

function formatWindow(start: number | null, end: number | null) {
  if (start == null || end == null) return 'Any time';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(start)}:00–${pad(end)}:00 UK`;
}

export default async function PricingPage() {
  const { db } = await requireAdminPermission('can_manage_payments');
  const [{ data: categories }, { data: rules }, modifiersRes] = await Promise.all([
    (db as any).from('service_categories').select('id, name').order('name'),
    (db as any).from('commission_rules').select('category_id, rate_bps'),
    (db as any)
      .from('pricing_modifiers')
      .select(
        'id, label, postcode_prefix, start_hour, end_hour, category_id, adjustment_percent, is_active',
      )
      .order('created_at', { ascending: false }),
  ]);

  const modifiers = modifiersRes.error ? [] : (modifiersRes.data ?? []);
  const modifiersReady = !modifiersRes.error;

  const bpsByCategory = new Map<string | null, number>(
    (rules ?? []).map((r: any) => [r.category_id, r.rate_bps]),
  );
  const defaultBps = bpsByCategory.get(null) ?? 0;
  const pct = (bps: number) => (bps / 100).toString();
  const categoryName = new Map<string, string>((categories ?? []).map((c: any) => [c.id, c.name]));

  const Row = ({ id, label, bps }: { id: string; label: string; bps: number }) => (
    <form
      action={setCommission}
      className="flex min-h-[44px] items-center justify-between gap-3 px-5 py-3"
    >
      <input type="hidden" name="category_id" value={id} />
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          name="percent"
          type="number"
          min="0"
          max="100"
          step="0.5"
          defaultValue={pct(bps)}
          className="w-20 text-right"
        />
        <span className="text-xs text-muted">%</span>
        <Button type="submit" size="sm" className="font-semibold">
          Save
        </Button>
      </div>
    </form>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Pricing & Commission"
        subtitle="Commission on completed bookings, plus region/time price modifiers on SKU rates."
        action={<Percent className="h-5 w-5 text-muted" aria-hidden />}
      />

      <div className="mb-8">
        <SectionHeader title="Region & time modifiers" />
        <p className="mb-3 text-xs text-muted">
          Matching rules stack (sum of %). Applied at booking create using the job postcode and
          UK local hour. Browse/quote UI still shows the base SKU price until checkout settles.
        </p>

        {!modifiersReady ? (
          <BentoTile static className="mb-4 !justify-start">
            <p className="text-sm text-muted">
              Modifiers table not available yet — run migration{' '}
              <span className="font-mono text-ink">202608030007_pricing_modifiers</span>.
            </p>
          </BentoTile>
        ) : (
          <>
            <TableTile>
              {modifiers.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No modifiers yet.</p>
              ) : (
                modifiers.map((m: any) => (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-2 border-b border-hairline px-5 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between ${
                      m.is_active ? '' : 'opacity-60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{m.label}</p>
                        <StatusChip tone={m.is_active ? 'success' : 'pending'}>
                          {m.is_active ? 'Active' : 'Off'}
                        </StatusChip>
                        <StatusChip tone={Number(m.adjustment_percent) >= 0 ? 'pending' : 'danger'}>
                          {Number(m.adjustment_percent) >= 0 ? '+' : ''}
                          {Number(m.adjustment_percent)}%
                        </StatusChip>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {m.postcode_prefix ? `Postcode ${m.postcode_prefix}*` : 'Any area'}
                        {' · '}
                        {formatWindow(m.start_hour, m.end_hour)}
                        {' · '}
                        {m.category_id
                          ? categoryName.get(m.category_id) ?? 'Category'
                          : 'All categories'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={toggleModifier}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="is_active" value={m.is_active ? 'false' : 'true'} />
                        <Button type="submit" variant="outline" size="sm">
                          {m.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </form>
                      <form action={deleteModifier}>
                        <input type="hidden" name="id" value={m.id} />
                        <Button type="submit" variant="outline" size="sm" aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </TableTile>

            <BentoTile static className="mt-4 !justify-start">
              <h3 className="mb-3 text-sm font-semibold text-ink">Add modifier</h3>
              <form action={createModifier} className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted sm:col-span-2">
                  Label
                  <Input name="label" required placeholder="Evening SW1 uplift" className="mt-1" />
                </label>
                <label className="text-xs text-muted">
                  Postcode prefix (optional)
                  <Input name="postcode_prefix" placeholder="SW1" className="mt-1 uppercase" />
                </label>
                <label className="text-xs text-muted">
                  Adjustment %
                  <Input
                    name="adjustment_percent"
                    type="number"
                    required
                    min={-50}
                    max={100}
                    step="0.5"
                    defaultValue="10"
                    className="mt-1"
                  />
                </label>
                <label className="text-xs text-muted">
                  Start hour UK (optional)
                  <Input name="start_hour" type="number" min={0} max={23} placeholder="17" className="mt-1" />
                </label>
                <label className="text-xs text-muted">
                  End hour UK (optional)
                  <Input name="end_hour" type="number" min={0} max={23} placeholder="21" className="mt-1" />
                </label>
                <label className="text-xs text-muted sm:col-span-2">
                  Category (optional)
                  <Select name="category_id" defaultValue="" className="mt-1">
                    <option value="">All categories</option>
                    {(categories ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" className="font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add modifier
                  </Button>
                </div>
              </form>
            </BentoTile>
          </>
        )}
      </div>

      <div className="mb-6">
        <SectionHeader title="Default commission" />
        <TableTile>
          <Row id="default" label="All categories (default)" bps={defaultBps} />
        </TableTile>
      </div>

      <div>
        <SectionHeader title="Per-category commission overrides" />
        <TableTile>
          {(categories ?? []).map((c: any) => (
            <Row key={c.id} id={c.id} label={c.name} bps={bpsByCategory.get(c.id) ?? defaultBps} />
          ))}
        </TableTile>
      </div>
    </div>
  );
}
