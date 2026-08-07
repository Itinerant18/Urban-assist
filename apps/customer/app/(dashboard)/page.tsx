import { Hero } from '@/components/hero';
import { CategoryGrid } from '@/components/category-grid';
import { PromoCarousel } from '@/components/promo-carousel';
import { FeaturedServices } from '@/components/featured-services';
import { WhyUs } from '@/components/why-us';
import { Testimonials } from '@/components/testimonials';
import { HowItWorks } from '@/components/how-it-works';
import { Footer } from '@/components/footer';
import { MobileHome } from '@/components/mobile-home';
import { getHomepageData } from '@/lib/homepage-data';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const data = await getHomepageData();

  return (
    <>
      <div className="lg:hidden">
        <MobileHome data={data} />
      </div>

      <div className="hidden lg:block">
        <main>
          <Hero promoCode={data.promoCode} />
          <CategoryGrid categories={data.categories} />
          <PromoCarousel promoCode={data.promoCode} />
          <HowItWorks />
          <FeaturedServices trending={data.trending} />
          <WhyUs />
          <Testimonials reviews={data.reviews} />
        </main>
        <Footer />
      </div>
    </>
  );
}
