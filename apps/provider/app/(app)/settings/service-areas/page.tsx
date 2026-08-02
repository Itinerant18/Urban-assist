import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Badge, EmptyState } from '@urban-assist/ui';
import { ArrowLeft, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ServiceAreasPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: areas }] = await Promise.all([
    db.from('profiles').select('travel_radius_miles').eq('id', user.id).single(),
    // Readable since migration 202608020003; still admin-managed for writes.
    db
      .from('provider_service_areas')
      .select('id, postcode_pattern, category:service_categories(name)')
      .eq('provider_id', user.id)
      .order('postcode_pattern'),
  ]);

  // One pill row per category, with a bucket for coverage that applies to all.
  const grouped = new Map<string, string[]>();
  for (const a of areas ?? []) {
    const key = (a as any).category?.name ?? 'All services';
    grouped.set(key, [...(grouped.get(key) ?? []), (a as any).postcode_pattern]);
  }

  return (
    <div className="space-y-4 py-2">
      <Link
        href="/settings"
        className="tap inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
          Where you work
        </h1>
        <p className="text-sm text-muted">
          Your travel radius and the postcode areas you can be dispatched to.
        </p>
      </header>

      <Card className="!p-4 bg-white flex items-center justify-between">
        <div>
          <p className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
            Travel radius
          </p>
          <p className="font-display text-2xl font-extrabold text-ink mt-0.5">
            {profile?.travel_radius_miles ? `${profile.travel_radius_miles} miles` : '—'}
          </p>
        </div>
        <MapPin className="h-5 w-5 text-muted" />
      </Card>

      <section className="space-y-3">
        <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
          Postcode coverage
        </h2>

        {grouped.size === 0 ? (
          <EmptyState
            title="No postcode areas set"
            description="Without coverage you can still receive automatic offers nearby, but our team cannot assign you jobs directly. Contact support to add your areas."
          />
        ) : (
          <div className="space-y-3">
            {[...grouped.entries()].map(([category, patterns]) => (
              <Card key={category} className="!p-4 bg-white space-y-2">
                <p className="text-sm font-semibold text-ink">{category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {patterns.map((p) => (
                    <Badge key={p} tone="muted">
                      {p}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-muted">
          Coverage is managed by the Urban Assist team so dispatch stays consistent. To change your
          areas, raise a request from{' '}
          <Link href="/account" className="underline hover:text-ink">
            your account page
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
