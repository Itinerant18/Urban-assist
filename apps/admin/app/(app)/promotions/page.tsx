import { revalidatePath } from 'next/cache';
import { Tag } from 'lucide-react';

import { requireAdminPermission } from '../../../lib/admin-auth';

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

export default async function PromotionsPage() {
  const { db } = await requireAdminPermission('can_manage_promo_codes');
  const { data } = await (db as any)
    .from('promo_codes')
    .select('id, code, discount_type, discount_value, max_redemptions, redemption_count, expires_at')
    .order('code');
  const promos = (data ?? []) as Promo[];

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Tag className="h-5 w-5 text-muted" />
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Promotions</h1>
          <p className="text-sm text-muted mt-1">{promos.length} promo codes.</p>
        </div>
      </div>

      <form action={createPromo} className="card mb-8 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
        <label className="col-span-2 sm:col-span-2 text-xs text-muted">
          Code
          <input name="code" required placeholder="WELCOME10" className="mt-1 w-full rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-sm text-ink uppercase focus:border-ink focus:outline-none" />
        </label>
        <label className="text-xs text-muted">
          Type
          <select name="discount_type" className="mt-1 w-full rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none">
            <option value="percent">% off</option>
            <option value="fixed">£ off</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Value
          <input name="discount_value" type="number" min="1" required placeholder="10" className="mt-1 w-full rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none" />
        </label>
        <label className="text-xs text-muted">
          Max uses
          <input name="max_redemptions" type="number" min="1" placeholder="∞" className="mt-1 w-full rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none" />
        </label>
        <label className="text-xs text-muted">
          Expires
          <input name="expires_at" type="date" className="mt-1 w-full rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none" />
        </label>
        <button type="submit" className="col-span-2 sm:col-span-6 rounded-lg bg-ink py-2 text-sm font-semibold text-white">
          Create code
        </button>
      </form>

      {promos.length === 0 ? (
        <p className="text-sm text-muted">No promo codes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {promos.map((p) => {
            const active = isActive(p);
            return (
              <div key={p.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-mono-utility text-sm font-semibold text-ink">
                    {p.code}{' '}
                    <span className="text-muted font-normal">
                      {p.discount_type === 'percent'
                        ? `${p.discount_value}% off`
                        : `£${(p.discount_value / 100).toFixed(2)} off`}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {p.redemption_count}
                    {p.max_redemptions != null ? `/${p.max_redemptions}` : ''} used
                    {p.expires_at && ` · expires ${new Date(p.expires_at).toLocaleDateString('en-GB')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${active ? 'text-green-600' : 'text-muted'}`}>
                    {active ? 'Active' : 'Inactive'}
                  </span>
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
        </div>
      )}
    </div>
  );
}
