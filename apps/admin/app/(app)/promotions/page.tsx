import { revalidatePath } from 'next/cache';
import { Percent, PoundSterling, Tag, Ticket } from 'lucide-react';
import { Button, Input, Select } from '@urban-assist/ui';

import { requireAdminPermission } from '../../../lib/admin-auth';
import {
  buildPromoCampaignStats,
  redemptionUtilization,
  summarizePromoCampaigns,
} from '../../../lib/admin-promo-analytics';
import {
  PageHeader,
  BentoTile,
  BentoGrid,
  StatTile,
  TableTile,
  StatusChip,
  BentoEmpty,
  SectionHeader,
} from '@/components/bento';

export const dynamic = 'force-dynamic';

const gbp = (pence: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

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
  const adminDb = db as any;

  const [{ data }, { data: promoBookings }] = await Promise.all([
    adminDb
      .from('promo_codes')
      .select('id, code, discount_type, discount_value, max_redemptions, redemption_count, expires_at')
      .order('code'),
    adminDb
      .from('bookings')
      .select('promo_code_id, status, total_pence, price_pence, created_at')
      .not('promo_code_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5000),
  ]);

  const promos = (data ?? []) as Promo[];
  const campaignStats = buildPromoCampaignStats(promos, promoBookings ?? []);
  const statsById = new Map(campaignStats.map((s) => [s.promoId, s]));
  const activeIds = new Set(promos.filter(isActive).map((p) => p.id));
  const totals = summarizePromoCampaigns(campaignStats, activeIds);

  return (
    <div>
      <PageHeader
        title="Promotions"
        subtitle={`${promos.length} codes · campaign performance from promo bookings.`}
      />

      <BentoGrid className="mb-6">
        <StatTile
          label="Active codes"
          value={String(totals.activeCampaigns)}
          sub={`${promos.length} total`}
          icon={Tag}
        />
        <StatTile
          label="Promo bookings"
          value={String(totals.promoBookings)}
          sub={`${totals.last14dBookings} in last 14d`}
          icon={Ticket}
        />
        <StatTile
          label="Promo GMV"
          value={gbp(totals.gmvPence)}
          sub={`${totals.completed} completed · ${totals.cancelled} cancelled`}
          icon={PoundSterling}
        />
        <StatTile
          label="Est. discount given"
          value={gbp(totals.estimatedDiscountPence)}
          sub="From rule + booking subtotal"
          icon={Percent}
        />
      </BentoGrid>

      <BentoTile static className="mb-8 !justify-start">
        <SectionHeader title="Create promo code" />
        <form action={createPromo} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
          <label className="col-span-2 sm:col-span-2 text-xs text-muted">
            Code
            <Input name="code" required placeholder="WELCOME10" className="mt-1 uppercase" />
          </label>
          <label className="text-xs text-muted">
            Type
            <Select name="discount_type" className="mt-1">
              <option value="percent">% off</option>
              <option value="fixed">£ off</option>
            </Select>
          </label>
          <label className="text-xs text-muted">
            Value
            <Input
              name="discount_value"
              type="number"
              min="1"
              required
              placeholder="10"
              className="mt-1"
            />
          </label>
          <label className="text-xs text-muted">
            Max uses
            <Input
              name="max_redemptions"
              type="number"
              min="1"
              placeholder="∞"
              className="mt-1"
            />
          </label>
          <label className="text-xs text-muted">
            Expires
            <Input name="expires_at" type="date" className="mt-1" />
          </label>
          <Button type="submit" className="col-span-2 font-semibold sm:col-span-6">
            Create code
          </Button>
        </form>
      </BentoTile>

      <SectionHeader title="Campaign ledger" className="mb-3" />
      {promos.length === 0 ? (
        <TableTile>
          <BentoEmpty icon={Tag} message="No promo codes yet." />
        </TableTile>
      ) : (
        <TableTile>
          <div className="hidden border-b border-hairline bg-bg/40 px-5 py-2 font-mono-utility text-[10px] font-bold uppercase tracking-wide text-muted sm:grid sm:grid-cols-12 sm:gap-2">
            <span className="sm:col-span-3">Code</span>
            <span className="sm:col-span-2 text-right">Redemptions</span>
            <span className="sm:col-span-2 text-right">Bookings</span>
            <span className="sm:col-span-2 text-right">GMV</span>
            <span className="sm:col-span-2 text-right">Est. discount</span>
            <span className="sm:col-span-1 text-right">Status</span>
          </div>
          {promos.map((p) => {
            const active = isActive(p);
            const stats = statsById.get(p.id);
            const util = redemptionUtilization(p.redemption_count, p.max_redemptions);
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 border-b border-hairline px-5 py-3 last:border-b-0 sm:grid sm:grid-cols-12 sm:items-center sm:gap-2 hover:bg-bg/60 transition-colors"
              >
                <div className="min-w-0 sm:col-span-3">
                  <p className="font-mono text-sm font-semibold text-ink">
                    {p.code}{' '}
                    <span className="text-muted font-sans font-normal">
                      {p.discount_type === 'percent'
                        ? `${p.discount_value}% off`
                        : `£${(p.discount_value / 100).toFixed(2)} off`}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {stats ? `${stats.last14dBookings} bookings · last 14d` : 'No attributed bookings'}
                    {p.expires_at &&
                      ` · expires ${new Date(p.expires_at).toLocaleDateString('en-GB')}`}
                  </p>
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  <p className="font-mono text-sm font-semibold text-ink">
                    {p.redemption_count}
                    {p.max_redemptions != null ? `/${p.max_redemptions}` : ''}
                  </p>
                  {util != null && (
                    <p className="text-[10px] text-muted">{util}% of cap</p>
                  )}
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  <p className="font-mono text-sm font-semibold text-ink">{stats?.bookings ?? 0}</p>
                  <p className="text-[10px] text-muted">
                    {stats?.completed ?? 0} done · {stats?.cancelled ?? 0} cancel
                  </p>
                </div>
                <div className="sm:col-span-2 sm:text-right font-mono text-sm font-semibold text-ink">
                  {gbp(stats?.gmvPence ?? 0)}
                </div>
                <div className="sm:col-span-2 sm:text-right font-mono text-sm text-ink">
                  {gbp(stats?.estimatedDiscountPence ?? 0)}
                </div>
                <div className="flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                  <StatusChip tone={active ? 'success' : 'pending'}>
                    {active ? 'Active' : 'Inactive'}
                  </StatusChip>
                  {active && (
                    <form action={deactivatePromo}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10">
                        Off
                      </Button>
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
