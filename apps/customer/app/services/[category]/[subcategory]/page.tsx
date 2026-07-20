import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import {
  getCategoryBySlug,
  getSubcategoryBySlug,
} from '../../../../lib/services-data';
import { Header } from '../../../../components/header';
import { Footer } from '../../../../components/footer';
import { SubcategoryClient } from './subcategory-client';

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
      .limit(8);

    return (data ?? []).map((s: any) => ({
      ...s,
      provider: Array.isArray(s.provider) ? s.provider[0] : s.provider,
    }));
  } catch {
    return [];
  }
}

function getDefaultFaqs(subcategoryName: string, categoryName: string) {
  return [
    {
      question: `How often should I book ${subcategoryName.toLowerCase()}?`,
      answer: `Frequency depends on your household size and routine. Many customers choose weekly or fortnightly recurring visits for maintenance, while others book one-off deep services as needed.`,
    },
    {
      question: `Do I need to provide equipment or materials?`,
      answer: `Our verified professionals bring standard tools and supplies. If you have specific preferred products or equipment, simply inform your provider prior to their arrival.`,
    },
    {
      question: `How is the service price calculated?`,
      answer: `Pricing is upfront and transparent based on the service selected, job duration, and property size. You will review the full cost before confirming your booking.`,
    },
    {
      question: `Can I reschedule or cancel my booking?`,
      answer: `Yes, you can cancel or reschedule free of charge up to 2 hours before the scheduled arrival time via your Urban Assist account dashboard.`,
    },
    {
      question: `What if I am not completely satisfied with the result?`,
      answer: `All services are backed by the Urban Assist Satisfaction Guarantee. If any detail falls short, let our customer care team know and we will arrange a complimentary fix.`,
    },
  ];
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
  const siblingSubcategories = category.subcategories.filter((s) => s.slug !== subcategory.slug);
  const faqs = getDefaultFaqs(subcategory.name, category.name);

  return (
    <>
      <Header />
      <SubcategoryClient
        category={{
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
        }}
        subcategory={subcategory}
        siblingSubcategories={siblingSubcategories}
        providers={providers}
        faqs={faqs}
      />
      <Footer />
    </>
  );
}