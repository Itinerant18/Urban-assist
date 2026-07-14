import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Header } from '../../../components/header';
import { Footer } from '../../../components/footer';
import { ProviderList } from './provider-list';
import { Suspense } from 'react';

// Force dynamic request-time rendering
export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const db = getSupabaseServer();

  // 1. Fetch category metadata by slug
  const { data: category, error: catError } = await db
    .from('service_categories')
    .select('*')
    .eq('slug', params.category)
    .single();

  if (catError || !category) {
    notFound();
  }

  // 2. Fetch provider services in this category from approved providers
  const { data: services, error: servicesError } = await db
    .from('provider_services')
    .select(`
      id,
      title,
      price_pence,
      duration_mins,
      description,
      profiles!inner (
        id,
        full_name,
        avatar_url,
        rating_avg,
        rating_count,
        kyc_status
      )
    `)
    .eq('category_id', category.id)
    .eq('is_active', true)
    .eq('profiles.kyc_status', 'approved')
    .order('price_pence', { ascending: true });

  const activeServices = (services ?? []).map((s: any) => ({
    ...s,
    profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
  })) as any[];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-16 pt-6 lg:px-6">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-xs text-muted mb-4 font-medium">
          <Link href="/" className="hover:text-ink transition">Home</Link>
          <span>&gt;</span>
          <Link href="/services" className="hover:text-ink transition">Services</Link>
          <span>&gt;</span>
          <span className="text-ink font-bold">{category.name}</span>
        </div>

        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> All services
        </Link>

        {/* Category Info Header */}
        <div className="mb-8 mt-3">
          <h1 className="text-[26px] font-extrabold text-ink lg:text-[32px] tracking-tight uppercase">
            {category.name}
          </h1>
          <p className="mt-1.5 text-[14px] text-muted leading-relaxed max-w-2xl">
            {category.description}
          </p>
        </div>

        {/* Interactive Provider Services Listing */}
        <Suspense fallback={<div className="h-96 animate-pulse bg-bg/5 rounded-3xl" />}>
          <ProviderList initialServices={activeServices} categorySlug={params.category} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
