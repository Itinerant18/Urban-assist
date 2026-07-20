import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Star } from 'lucide-react';
import { getSupabaseServer } from '@urban-assist/db/server';
import { pence } from '@urban-assist/lib';
import {
  getCategoryBySlug,
  getSubcategoryBySlug,
  getCategoryIcon,
} from '../../../../lib/services-data';
import { Header } from '../../../../components/header';
import { Footer } from '../../../../components/footer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { category: string; subcategory: string };
}) {
  const sub = getSubcategoryBySlug(params.category, params.subcategory);
  const cat = getCategoryBySlug(params.category);
  return {
    title: sub ? `${sub.name} - ${cat?.name} - Urban Assist` : 'Services - Urban Assist',
    description: sub?.description,
  };
}

async function fetchProviders(categorySlug: string) {
  try {
    const db = getSupabaseServer();
    const { data: cat } = await db
      .from('service_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();
    if (!cat) return [];
    const { data } = await db
      .from('provider_services')
      .select(
        'id, title, price_pence, duration_mins, description, provider:profiles!inner(id, full_name, avatar_url, rating_avg, rating_count, kyc_status)'
      )
      .eq('category_id', cat.id)
      .eq('is_active', true)
      .eq('profiles.kyc_status', 'approved')
      .order('price_pence', { ascending: true })
      .limit(6);
    return (data ?? []).map((s: any) => ({
      ...s,
      provider: Array.isArray(s.provider) ? s.provider[0] : s.provider,
    }));
  } catch {
    return [];
  }
}

export default async function SubcategoryPage({
  params,
}: {
  params: { category: string; subcategory: string };
}) {
  const category = getCategoryBySlug(params.category);
  const subcategory = getSubcategoryBySlug(params.category, params.subcategory);

  if (!subcategory || !category) {
    notFound();
  }

  const providers = await fetchProviders(params.category);
  const CatIcon = getCategoryIcon(category.icon);
  const catColor = category.color ?? '#1F3A4D';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-16 pt-6 lg:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted mb-4 font-medium flex-wrap">
          <Link href="/" className="hover:text-ink transition">Home</Link>
          <span>{'>'}</span>
          <Link href="/services" className="hover:text-ink transition">Services</Link>
          <span>{'>'}</span>
          <Link href={`/services/${params.category}`} className="hover:text-ink transition">
            {category.name}
          </Link>
          <span>{'>'}</span>
          <span className="text-ink font-bold">{subcategory.name}</span>
        </div>

        <Link
          href={`/services/${params.category}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {category.name}
        </Link>

        {/* Subcategory Header */}
        <div className="mb-8 mt-3 flex items-center gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
            style={{ background: `${catColor}18` }}
          >
            <CatIcon className="h-6 w-6" style={{ color: catColor }} />
          </span>
          <div>
            <h1 className="text-[26px] font-extrabold text-ink lg:text-[32px] tracking-tight">
              {subcategory.name}
            </h1>
            <p className="mt-1 text-[14px] text-muted leading-relaxed max-w-2xl">
              {subcategory.description}
            </p>
          </div>
        </div>

        {/* Services Grid */}
        <section className="mb-12">
          <h2 className="text-[18px] font-extrabold text-ink mb-4">Services in this category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategory.services.map((service) => {
              const ServiceIcon = getCategoryIcon(service.icon ?? subcategory.icon);
              return (
                <Link
                  key={service.id}
                  href={`/services/${params.category}/${params.subcategory}/${service.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-input-border bg-white p-5 shadow-sm transition-all hover:border-accent hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl group-hover:bg-accent/10 transition-colors"
                      style={{ background: `${catColor}12` }}
                    >
                      <ServiceIcon
                        className="h-5 w-5 group-hover:text-accent transition-colors"
                        style={{ color: catColor }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold leading-tight text-ink group-hover:text-accent transition-colors">
                        {service.name}
                      </p>
                      <p className="mt-1 text-[12px] text-muted line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-hairline">
                    <div className="flex items-center gap-3 text-[12px] text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        ~{Math.round((service.durationMins / 60) * 10) / 10}h
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] text-muted">From </span>
                      <span className="text-[14px] font-extrabold text-ink">
                        {pence(service.minPricePence)}
                      </span>
                    </div>
                  </div>
                  {service.isPopular && (
                    <span className="self-start rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                      Popular
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Available Professionals */}
        {providers.length > 0 && (
          <section>
            <h2 className="text-[18px] font-extrabold text-ink mb-4">
              Available professionals for {category.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((p: any) => {
                const rating = p.provider?.rating_avg ?? 5.0;
                const count = p.provider?.rating_count ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border border-hairline bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-hairline shrink-0 flex items-center justify-center border border-hairline shadow-sm">
                        {p.provider?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[16px] font-bold text-muted">
                            {(p.provider?.full_name ?? 'P')[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink text-sm truncate">
                          {p.provider?.full_name ?? 'Professional'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mt-0.5">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>{rating.toFixed(1)}</span>
                          <span className="text-muted font-medium">({count})</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-hairline pt-3">
                      <p className="font-bold text-ink text-sm">{p.title}</p>
                      <p className="text-[10px] font-bold text-muted mt-1">
                        {pence(p.price_pence)}
                      </p>
                    </div>
                    <Link
                      href={`/book/${p.id}`}
                      className="mt-auto block rounded-xl bg-accent px-4 py-2 text-center text-[13px] font-bold text-white transition hover:bg-accent-hover"
                    >
                      Book now
                    </Link>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <Link
                href={`/services/${params.category}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:text-accent-hover"
              >
                Browse all {category.name} professionals →
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}