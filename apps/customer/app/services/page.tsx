import { SERVICE_CATEGORIES } from '../../lib/services-data';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CategoryTabs } from '../../components/services/category-tabs';
import { CategorySection } from '../../components/services/category-section';
import { ServiceSearch } from '../../components/services/service-search';

export const metadata = {
  title: 'All Services · Urban Assist',
  description: 'Browse every home service category, room and job Urban Assist covers.',
};

// Static — the taxonomy is code, not a request-time DB read.
export default function AllServicesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-20 pt-8 lg:px-6">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-[32px] font-bold text-ink lg:text-[40px]">All Services</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted leading-relaxed">
            Discover every home service category we cover. From cleaning to repairs, find trusted professionals in your area.
          </p>
          
          {/* Search Bar */}
          <div className="mt-6 max-w-2xl">
            <ServiceSearch inputClassName="bg-white shadow-sm focus:shadow-md" />
          </div>
        </div>

        {/* Category Navigation */}
        <CategoryTabs categories={SERVICE_CATEGORIES} />

        {/* Services by Category */}
        <div className="mt-12 space-y-16">
          {SERVICE_CATEGORIES.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
