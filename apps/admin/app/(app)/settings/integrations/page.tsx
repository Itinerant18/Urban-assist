import { Plug } from 'lucide-react';

import { requireAdminRole } from '../../../../lib/admin-auth';
import { PageHeader, BentoTile, BentoGrid, StatusChip } from '@/components/bento';

export const dynamic = 'force-dynamic';

type IntegrationStatus = {
  name: string;
  detail: string;
  configured: boolean;
  live: boolean | null; // null = no live probe attempted
  error?: string;
};

function present(...names: string[]): boolean {
  return names.every((n) => Boolean(process.env[n]));
}

/**
 * Read-only configuration health. Env presence everywhere; a live probe only
 * where one is free (Stripe, Upstash). No config editing — env vars are the
 * config store, and editing secrets from a web page is a bad trade.
 */
async function collectStatuses(): Promise<IntegrationStatus[]> {
  const statuses: IntegrationStatus[] = [];

  const stripeConfigured = present('STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  let stripeLive: boolean | null = null;
  let stripeError: string | undefined;
  if (stripeConfigured) {
    try {
      const { stripe } = await import('@urban-assist/integrations/stripe');
      await stripe().balance.retrieve();
      stripeLive = true;
    } catch (e: any) {
      stripeLive = false;
      stripeError = e?.message;
    }
  }
  statuses.push({
    name: 'Stripe',
    detail: 'Payments, refunds, Connect payouts',
    configured: stripeConfigured,
    live: stripeLive,
    error: stripeError,
  });

  const upstashConfigured = present('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN');
  let upstashLive: boolean | null = null;
  let upstashError: string | undefined;
  if (upstashConfigured) {
    try {
      const { redis } = await import('@urban-assist/integrations/redis');
      await (redis() as any).get('integration:probe');
      upstashLive = true;
    } catch (e: any) {
      upstashLive = false;
      upstashError = e?.message;
    }
  }
  statuses.push({
    name: 'Upstash Redis',
    detail: 'Rate limits, provider location cache, dashboard cache',
    configured: upstashConfigured,
    live: upstashLive,
    error: upstashError,
  });

  statuses.push({
    name: 'Supabase',
    detail: 'Database, auth, storage — this page rendered through it',
    configured: present('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'),
    live: true,
  });

  statuses.push({
    name: 'Twilio',
    detail: 'Phone OTP via Supabase auth (config lives in Supabase)',
    // Twilio creds are held by Supabase auth, not this app — presence of phone
    // login working is the real signal; nothing to check locally.
    configured: true,
    live: null,
  });

  statuses.push({
    name: 'Firebase',
    detail: 'FCM push + Firestore realtime mirror',
    configured: present('FIREBASE_SERVICE_ACCOUNT_JSON'),
    live: null,
  });

  return statuses;
}

export default async function IntegrationsPage() {
  await requireAdminRole(['super_admin']);
  const statuses = await collectStatuses();

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Configuration and reachability. Secrets are managed via environment, not here."
        action={<Plug className="h-5 w-5 text-muted" aria-hidden />}
      />
      <BentoGrid>
        {statuses.map((s) => (
          <BentoTile key={s.name} static className="col-span-2 md:col-span-3 lg:col-span-4 !justify-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <p className="mt-1 text-xs text-muted">{s.detail}</p>
                {s.error && <p className="mt-1 text-xs text-danger">{s.error}</p>}
              </div>
              <StatusChip
                tone={
                  !s.configured
                    ? 'danger'
                    : s.live === false
                      ? 'danger'
                      : s.live === true
                        ? 'success'
                        : 'pending'
                }
              >
                {!s.configured
                  ? 'not configured'
                  : s.live === true
                    ? 'connected'
                    : s.live === false
                      ? 'unreachable'
                      : 'configured'}
              </StatusChip>
            </div>
          </BentoTile>
        ))}
      </BentoGrid>
    </div>
  );
}
