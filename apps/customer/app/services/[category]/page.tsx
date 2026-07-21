import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Header } from '../../../components/header';
import { Footer } from '../../../components/footer';
import { ProviderList } from './provider-list';
import { Suspense } from 'react';
import { getCategoryBySlug } from '../../../lib/catalog';
import { getCategoryIcon } from '../../../lib/services-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { category: string } }) {
  const cat = await getCategoryBySlug(params.category);
  return {
    title: cat ? `${cat.name} - Urban Assist` : 'Services - Urban Assist',
    description: cat?.description,
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const db = getSupabaseServer();

  const taxonomyCategory = await getCategoryBySlug(params.category);

  if (!taxonomyCategory) {
    notFound();
  }

  const category = taxonomyCategory;

  const { data: services } = category.id
    ? await db
        .from('provider_services')
        .select(`id, title, price_pence, duration_mins, description, profiles!inner (id, full_name, avatar_url, rating_avg, rating_count, kyc_status)`)
        .eq('category_id', category.id)
        .eq('is_active', true)
        .eq('profiles.kyc_status', 'approved')
        .order('price_pence', { ascending: true })
    : { data: [] };

  const activeServices = (services ?? []).map((s: any) => ({
    ...s,
    profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
  })) as any[];

  const CatIcon = taxonomyCategory ? getCategoryIcon(taxonomyCategory.icon) : null;
  const subcategories = taxonomyCategory?.subcategories ?? [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-16 pt-6 lg:px-6">
        <div className="flex items-center gap-2 text-xs text-muted mb-4 font-medium">
          <Link href="/" className="hover:text-ink transition">Home</Link>
          <span>{'>'}</span>
          <Link href="/services" className="hover:text-ink transition">Services</Link>
          <span>{'>'}</span>
          <span className="text-ink font-bold">{category.name}</span>
        </div>

        <Link href="/services" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All services
        </Link>

        <div className="mb-8 mt-3 flex items-center gap-4">
          {CatIcon && (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: `${taxonomyCategory?.color ?? '#1F3A4D'}18` }}>
              <CatIcon className="h-6 w-6" style={{ color: taxonomyCategory?.color ?? '#1F3A4D' }} />
            </span>
          )}
          <div>
            <h1 className="text-[26px] font-extrabold text-ink lg:text-[32px] tracking-tight">{category.name}</h1>
            <p className="mt-1 text-[14px] text-muted leading-relaxed max-w-2xl">{category.description}</p>
          </div>
        </div>

        {subcategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[18px] font-extrabold text-ink mb-4">Browse by type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {subcategories.map((sub) => {
                const SubIcon = getCategoryIcon(sub.icon);
                return (
                  <Link key={sub.id} href={`/services/${params.category}/${sub.slug}`} className="group flex flex-col items-center gap-3 rounded-2xl border border-input-border bg-white p-5 text-center shadow-sm transition-all hover:border-accent hover:shadow-md hover:-translate-y-0.5">
                    <span className="grid h-12 w-12 place-items-center rounded-xl transition-colors group-hover:bg-accent/10" style={{ background: `${taxonomyCategory?.color ?? '#1F3A4D'}12` }}>
                      <SubIcon className="h-5 w-5 transition-colors group-hover:text-accent" style={{ color: taxonomyCategory?.color ?? '#1F3A4D' }} />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold leading-tight text-ink group-hover:text-accent transition-colors">{sub.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{sub.services.length} service{sub.services.length !== 1 ? 's' : ''}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[18px] font-extrabold text-ink mb-4">Available professionals</h2>
          <Suspense fallback={<div className="h-96 animate-pulse bg-bg/5 rounded-3xl" />}>
            <ProviderList initialServices={activeServices} categorySlug={params.category} />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}