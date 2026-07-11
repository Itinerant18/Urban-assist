import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Star } from 'lucide-react';
import { getSupabaseServer } from '@urban-assist/db/server';
import { pence } from '@urban-assist/lib';
import { getCategoryBySlug, getCategoryIcon, type ServiceItem, type Subcategory } from '../../../../lib/services-data';
import { Header } from '../../../../components/header';
import { Footer } from '../../../../components/footer';
import { ServiceCard } from '../../../../components/services/service-card';

export const dynamic = 'force-dynamic';

/** Find a service by slug anywhere in the category (subcategory in the URL would be noise). */
function findService(categorySlug: string, serviceSlug: string): { service: ServiceItem; subcategory: Subcategory } | null {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return null;
  for (const subcategory of category.subcategories) {
    const service = subcategory.services.find((s) => s.slug === serviceSlug);
    if (service) return { service, subcategory };
  }
  return null;
}

export function generateMetadata({ params }: { params: { category: string; service: string } }) {
  const hit = findService(params.category, params.service);
  return {
    title: hit ? `${hit.service.name} · Urban Assist` : 'Service · Urban Assist',
    description: hit?.service.description,
  };
}

// Live provider offerings that plausibly match this service (title token match
// within the same DB category). ponytail: fuzzy title match until provider
// services reference taxonomy slugs directly.
async function fetchProviders(categorySlug: string, serviceName: string) {
  try {
    const db = getSupabaseServer();
    const { data: cat } = await db.from('service_categories').select('id').eq('slug', categorySlug).single();
    let query = db
      .from('provider_services')
      .select('id, title, price_pence, duration_mins, provider:profiles!inner(full_name, avatar_url, rating_avg, rating_count, kyc_status)')
      .eq('is_active', true)
      .limit(10);
    if (cat) query = query.eq('category_id', cat.id);
    const { data } = await query;
    const tokens = serviceName.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    return (data ?? []).filter((s) =>
      tokens.some((t) => s.title.toLowerCase().includes(t)),
    );
  } catch {
    return [];
  }
}

export default async function ServiceDetailPage({ params }: { params: { category: string; service: string } }) {
  const hit = findService(params.category, params.service);
  if (!hit) notFound();
  const { service, subcategory } = hit;
  const category = getCategoryBySlug(params.category)!;
  const Icon = getCategoryIcon(service.icon ?? subcategory.icon);
  const providers = await fetchProviders(params.category, service.name);
  const related = subcategory.services.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-28 pt-6 lg:px-6 lg:pb-16">
        <Link
          href={`/services/${category.slug}`}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {category.name}
        </Link>

        <div className="mt-4 flex flex-col gap-8 lg:flex-row">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: `${category.color ?? '#1F3A4D'}14` }}>
                <Icon className="h-6 w-6" style={{ color: category.color ?? '#1F3A4D' }} />
              </span>
              <div>
                <h1 className="text-[26px] font-extrabold leading-tight text-ink">{service.name}</h1>
                <p className="mt-1 text-[14px] text-muted">{service.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                  <span className="flex items-center gap-1 text-muted">
                    <Clock className="h-3.5 w-3.5" /> ~{Math.round(service.durationMins / 60 * 10) / 10}h
                  </span>
                  <span className="font-extrabold text-ink">
                    {pence(service.minPricePence)} – {pence(service.maxPricePence)}
                  </span>
                  {service.isPopular && (
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                      Popular
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Providers offering this */}
            <section className="mt-10">
              <h2 className="text-[18px] font-extrabold text-ink">Available professionals</h2>
              {providers.length === 0 ? (
                <div className="mt-3 rounded-xl border border-hairline bg-white p-5">
                  <p className="text-[14px] text-ink">No professionals have listed this exact service yet.</p>
                  <Link
                    href={`/browse?category=${category.slug}`}
                    className="mt-1 inline-block text-[13px] font-semibold text-accent hover:text-accent-hover"
                  >
                    Browse all {category.name} providers →
                  </Link>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {providers.map((p: any) => (
                    <li key={p.id}>
                      <Link href={`/book/${p.id}`} className="card card-shadow flex items-center gap-4 rounded-xl border border-hairline bg-white p-4 transition hover:border-accent">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-hairline">
                          {p.provider?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold text-ink">{p.title}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                            <span>{p.provider?.full_name}</span>
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber text-amber" />
                              {Number(p.provider?.rating_avg ?? 0).toFixed(1)}
                              {p.provider?.rating_count ? ` (${p.provider.rating_count})` : ''}
                            </span>
                            <span>· {p.duration_mins} min</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-muted">From</div>
                          <div className="text-[16px] font-extrabold text-ink">{pence(p.price_pence)}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Related services */}
            {related.length > 0 && (
              <section className="mt-10">
                <h2 className="text-[18px] font-extrabold text-ink">More {subcategory.name.toLowerCase()}</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((s) => (
                    <ServiceCard key={s.id} service={s} categorySlug={category.slug} icon={subcategory.icon} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Booking sidebar (desktop) */}
          <aside className="hidden lg:block lg:w-80 lg:shrink-0">
            <div className="card-shadow rounded-2xl border border-hairline bg-white p-5 lg:sticky lg:top-20">
              <div className="text-[13px] text-muted">Typical price</div>
              <div className="text-[22px] font-extrabold text-ink">
                {pence(service.minPricePence)} – {pence(service.maxPricePence)}
              </div>
              <p className="mt-1 text-[12px] text-muted">
                Final price depends on the professional and job size. Pay by card or cash after the visit.
              </p>
              <Link
                href={`/browse?category=${category.slug}&q=${encodeURIComponent(service.name)}`}
                className="mt-4 block rounded-xl bg-accent px-5 py-3 text-center text-[14px] font-bold text-white transition hover:bg-accent-hover"
              >
                Book now
              </Link>
              <p className="mt-2 text-center text-[11px] text-muted">
                Free cancellation until the professional is on their way.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky book bar (mobile) — thumb-zone CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-muted">From</div>
            <div className="text-[17px] font-extrabold leading-tight text-ink">{pence(service.minPricePence)}</div>
          </div>
          <Link
            href={`/browse?category=${category.slug}&q=${encodeURIComponent(service.name)}`}
            className="rounded-xl bg-accent px-8 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover"
          >
            Book now
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
