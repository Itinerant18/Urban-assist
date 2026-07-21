import { revalidatePath } from 'next/cache';
import { Tag } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';
import {
  PageHeader,
  BentoTile,
  TableTile,
  StatusChip,
  BentoEmpty,
  SectionHeader,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

type Promo = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
};

async function createPromo(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_promo_codes');
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const discount_type = String(formData.get('discount_type'));
  const discount_value = Number(formData.get('discount_value'));
  const maxRaw = formData.get('max_redemptions');
  const expiresRaw = formData.get('expires_at');
  if (!code || !['percent', 'fixed'].includes(discount_type) || !Number.isFinite(discount_value)) {
    return;
  }

  const { data: inserted } = await (db as any)
    .from('promo_codes')
    .insert({
      code,
      discount_type,
      discount_value,
      max_redemptions: maxRaw ? Number(maxRaw) : null,
      expires_at: expiresRaw ? new Date(String(expiresRaw)).toISOString() : null,
    })
    .select('id')
    .single();

  if (inserted) {
    await (db as any).rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: null,
      p_action_type: 'PROMO_CREATE',
      p_entity_type: 'promo_code',
      p_entity_id: inserted.id,
      p_context: { code, discount_type, discount_value },
    });
  }
  revalidatePath('/promotions');
}

async function deactivatePromo(formData: FormData) {
  'use server';
  const { db, user } = await requireAdminPermission('can_manage_promo_codes');
  const id = String(formData.get('id'));
  if (!id) return;
  await (db as any).from('promo_codes').update({ expires_at: new Date().toISOString() }).eq('id', id);
  await (db as any).rpc('append_admin_action_log', {
    p_actor_user_id: user.id,
    p_actor_role_code: null,
    p_action_type: 'PROMO_DEACTIVATE',
    p_entity_type: 'promo_code',
    p_entity_id: id,
    p_context: {},
  });
  revalidatePath('/promotions');
}

function isActive(p: Promo) {
  const notExpired = !p.expires_at || new Date(p.expires_at) > new Date();
  const underCap = p.max_redemptions == null || p.redemption_count < p.max_redemptions;
  return notExpired && underCap;
}

const fieldClass =
  'mt-1 w-full rounded-xl border border-hairline bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none';

export default async function PromotionsPage() {
  const { db } = await requireAdminPermission('can_manage_promo_codes');
  const { data } = await (db as any)
    .from('promo_codes')
    .select('id, code, discount_type, discount_value, max_redemptions, redemption_count, expires_at')
    .order('code');
  const promos = (data ?? []) as Promo[];

  return (
    <div>
      <PageHeader title="Promotions" subtitle={`${promos.length} promo codes.`} />

      <BentoTile static className="mb-8 !justify-start">
        <SectionHeader title="Create promo code" />
        <form action={createPromo} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
          <label className="col-span-2 sm:col-span-2 text-xs text-muted">
            Code
            <input name="code" required placeholder="WELCOME10" className={`${fieldClass} uppercase`} />
          </label>
          <label className="text-xs text-muted">
            Type
            <select name="discount_type" className={fieldClass}>
              <option value="percent">% off</option>
              <option value="fixed">£ off</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Value
            <input
              name="discount_value"
              type="number"
              min="1"
              required
              placeholder="10"
              className={fieldClass}
            />
          </label>
          <label className="text-xs text-muted">
            Max uses
            <input
              name="max_redemptions"
              type="number"
              min="1"
              placeholder="∞"
              className={fieldClass}
            />
          </label>
          <label className="text-xs text-muted">
            Expires
            <input name="expires_at" type="date" className={fieldClass} />
          </label>
          <button
            type="submit"
            className="col-span-2 sm:col-span-6 rounded-xl bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Create code
          </button>
        </form>
      </BentoTile>

      {promos.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={Tag} message="No promo codes yet." />
        </TableTile>
      ) : (
        <TableTile>
          {promos.map((p) => {
            const active = isActive(p);
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-ink">
                    {p.code}{' '}
                    <span className="text-muted font-sans font-normal">
                      {p.discount_type === 'percent'
                        ? `${p.discount_value}% off`
                        : `£${(p.discount_value / 100).toFixed(2)} off`}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {p.redemption_count}
                    {p.max_redemptions != null ? `/${p.max_redemptions}` : ''} used
                    {p.expires_at &&
                      ` · expires ${new Date(p.expires_at).toLocaleDateString('en-GB')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusChip tone={active ? 'success' : 'pending'}>
                    {active ? 'Active' : 'Inactive'}
                  </StatusChip>
                  {active && (
                    <form action={deactivatePromo}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-xs text-danger hover:underline">
                        Deactivate
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </TableTile>
      )}
    </div>
  );
}
