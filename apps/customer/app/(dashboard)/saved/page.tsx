import * as React from 'react';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Badge } from '@urban-assist/ui';
import { Heart, Tag, ArrowRight } from 'lucide-react';
import { pence } from '@urban-assist/lib';

export default async function SavedPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const currentTab = searchParams.tab === 'promos' ? 'promos' : 'providers';

  // Fetch Providers
  let providers: any[] = [];
  if (currentTab === 'providers') {
    const { data: favs } = await db
      .from('favorites')
      .select('provider_id')
      .eq('customer_id', user.id);
      
    if (favs && favs.length > 0) {
      const providerIds = favs.map(f => f.provider_id);
      const { data: profs } = await db
        .from('profiles')
        .select('id, full_name, avatar_url, rating_avg')
        .in('id', providerIds)
        .eq('role', 'provider');
      providers = profs || [];
    }
  }

  // Fetch Promos
  let promos: any[] = [];
  if (currentTab === 'promos') {
    const { data } = await db
      .from('promo_codes')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });
    promos = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Saved & Offers</h1>
        <p className="text-sm text-muted mt-1">Manage your favorite professionals and active promotions.</p>
      </div>

      <div className="flex rounded-xl bg-hairline/30 p-1">
        <Link
          href="/saved?tab=providers"
          className={`flex-1 rounded-lg py-2 text-center text-sm transition-colors ${
            currentTab === 'providers' ? 'bg-white shadow-sm font-medium text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          Saved Providers
        </Link>
        <Link
          href="/saved?tab=promos"
          className={`flex-1 rounded-lg py-2 text-center text-sm transition-colors ${
            currentTab === 'promos' ? 'bg-white shadow-sm font-medium text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          Active Promo Codes
        </Link>
      </div>

      <div>
        {currentTab === 'providers' && (
          <div className="space-y-4">
            {providers.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-12 text-muted">
                <Heart className="mb-4 h-12 w-12 opacity-20" />
                <p>No saved providers yet.</p>
                <Link href="/browse" className="mt-2 text-sm text-accent hover:underline">
                  Browse services
                </Link>
              </Card>
            ) : (
              providers.map((p) => (
                <Card key={p.id} className="flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-hairline">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-ink">{p.full_name}</h3>
                    <div className="text-sm text-muted">★ {Number(p.rating_avg || 0).toFixed(1)}</div>
                  </div>
                  <Link
                    href={`/profile/${p.id}`}
                    className="shrink-0 h-10 w-10 p-2 flex items-center justify-center rounded-full border border-hairline hover:bg-hairline/40 transition"
                  >
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </Link>
                </Card>
              ))
            )}
          </div>
        )}

        {currentTab === 'promos' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {promos.length === 0 ? (
              <Card className="col-span-full flex flex-col items-center justify-center py-12 text-muted">
                <Tag className="mb-4 h-12 w-12 opacity-20" />
                <p>No active promotions right now.</p>
              </Card>
            ) : (
              promos.map((promo) => (
                <Card key={promo.id} className="relative overflow-hidden border-accent/20 bg-accent/5">
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-accent/20 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <Badge tone="success" className="font-mono-utility text-xs">
                        {promo.code}
                      </Badge>
                      <span className="text-[10px] text-muted">
                        Expires {new Date(promo.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-3 font-display text-2xl font-bold">
                      {promo.discount_type === 'percent'
                        ? `${promo.discount_value}% OFF`
                        : `${pence(promo.discount_value)} OFF`}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      Use code at checkout on your next booking.
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
