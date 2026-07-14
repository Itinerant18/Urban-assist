import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CatalogClient } from './catalog-client';
import { Suspense } from 'react';

export const metadata = {
  title: 'All Services · Urban Assist',
  description: 'Browse every home service category, room and job Urban Assist covers.',
};

export default function AllServicesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-page px-4 pb-20 pt-8 lg:px-6">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-[32px] font-bold text-ink lg:text-[40px] tracking-tight">All Services</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted leading-relaxed">
            Discover every home service category we cover. From cleaning to repairs, find trusted professionals in your area.
          </p>
        </div>

        {/* Dense Catalog & Directory Client */}
        <Suspense fallback={<div className="h-96 animate-pulse bg-bg/5 rounded-3xl" />}>
          <CatalogClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
