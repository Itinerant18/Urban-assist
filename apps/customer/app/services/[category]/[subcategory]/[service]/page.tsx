import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { getSupabaseServer } from '@urban-assist/db/server';
import { pence } from '@urban-assist/lib';
import { getCategoryBySlug, getServiceBySlug } from '../../../../../lib/catalog';
import { getCategoryIcon } from '../../../../../lib/services-data';
import { Header } from '../../../../../components/header';
import { Footer } from '../../../../../components/footer';
import { ServiceCard } from '../../../../../components/services/service-card';
import { ProviderList } from '../../../../../components/services/provider-list';

export const dynamic = 'force-dynamic';

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
    return (data ?? []).filter((s) => tokens.some((t) => s.title.toLowerCase().includes(t)));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { category: string; subcategory: string; service: string } }) {
  const service = await getServiceBySlug(params.category, params.subcategory, params.service);
  return {
    title: service ? `${service.name} - Urban Assist` : 'Service - Urban Assist',
    description: service?.description,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: { category: string; subcategory: string; service: string };
}) {
  const [category, service] = await Promise.all([
    getCategoryBySlug(params.category),
    getServiceBySlug(params.category, params.subcategory, params.service),
  ]);
  const subcategory = category?.subcategories.find((s) => s.slug === params.subcategory);

  if (!service || !category || !subcategory) notFound();

  const Icon = getCategoryIcon(service.icon ?? subcategory.icon);
  const providers = await fetchProviders(params.category, service.name);
  const related = subcategory.services.filter((s) => s.slug !== service.slug).slice(0, 3);
  const catColor = category.color ?? '#1F3A4D';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-28 pt-6 lg:px-6 lg:pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted mb-3 font-medium flex-wrap">
          <Link href="/" className="hover:text-ink transition">Home</Link>
          <span>{'>'}</span>
          <Link href="/services" className="hover:text-ink transition">Services</Link>
          <span>{'>'}</span>
          <Link href={`/services/${params.category}`} className="hover:text-ink transition">{category.name}</Link>
          <span>{'>'}</span>
          <Link href={`/services/${params.category}/${params.subcategory}`} className="hover:text-ink transition">{subcategory.name}</Link>
          <span>{'>'}</span>
          <span className="text-ink font-bold">{service.name}</span>
        </div>

        <Link
          href={`/services/${params.category}/${params.subcategory}`}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {subcategory.name}
        </Link>

        <div className="mt-4 flex flex-col gap-8 lg:flex-row">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: `${catColor}14` }}>
                <Icon className="h-6 w-6" style={{ color: catColor }} />
              </span>
              <div>
                <h1 className="text-[26px] font-extrabold leading-tight text-ink">{service.name}</h1>
                <p className="mt-1 text-[14px] text-muted">{service.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                  <span className="flex items-center gap-1 text-muted">
                    <Clock className="h-3.5 w-3.5" /> ~{Math.round(service.durationMins / 60 * 10) / 10}h
                  </span>
                  <span className="font-extrabold text-ink">
                    {pence(service.minPricePence)} - {pence(service.maxPricePence)}
                  </span>
                  {service.isPopular && (
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">Popular</span>
                  )}
                </div>
              </div>
            </div>

            {/* Providers */}
            <section className="mt-10">
              <h2 className="text-[18px] font-extrabold text-ink">Available professionals</h2>
              {providers.length === 0 ? (
                <div className="mt-3 rounded-xl border border-hairline bg-white p-5">
                  <p className="text-[14px] text-ink">No professionals have listed this exact service yet.</p>
                  <Link href={`/browse?category=${category.slug}`} className="mt-1 inline-block text-[13px] font-semibold text-accent hover:text-accent-hover">
                    Browse all {category.name} providers
                  </Link>
                </div>
              ) : (
                <ProviderList providers={providers as any} />
              )}
            </section>

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-10">
                <h2 className="text-[18px] font-extrabold text-ink">More {subcategory.name.toLowerCase()}</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((s) => (
                    <ServiceCard key={s.id} service={s} categorySlug={category.slug} subcategorySlug={subcategory.slug} icon={subcategory.icon} />
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
                {pence(service.minPricePence)} - {pence(service.maxPricePence)}
              </div>
              <p className="mt-1 text-[12px] text-muted">Final price depends on the professional and job size.</p>
              <Link
                href={`/browse?category=${category.slug}&q=${encodeURIComponent(service.name)}`}
                className="mt-4 block rounded-xl bg-accent px-5 py-3 text-center text-[14px] font-bold text-white transition hover:bg-accent-hover"
              >
                Book now
              </Link>
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky mobile book bar */}
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
