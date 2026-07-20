'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Star,
  CheckCircle2,
  ShieldCheck,
  Tag,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  SlidersHorizontal,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { pence } from '@urban-assist/lib';
import { getCategoryIcon, type ServiceItem, type Subcategory } from '../../../../lib/services-data';

interface ProviderPreview {
  id: string;
  title: string;
  price_pence: number;
  provider: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating_avg: number;
    rating_count: number;
    kyc_status: string;
  };
}

interface SubcategoryClientProps {
  category: {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    color?: string;
  };
  subcategory: Subcategory;
  siblingSubcategories: Subcategory[];
  providers: ProviderPreview[];
  faqs: { question: string; answer: string }[];
}

export function SubcategoryClient({
  category,
  subcategory,
  siblingSubcategories,
  providers,
  faqs,
}: SubcategoryClientProps) {
  // ── States ───────────────────────────────────────────────────
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [popularOnly, setPopularOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'popular' | 'price_low' | 'price_high' | 'duration'>('popular');
  const [priceFilter, setPriceFilter] = React.useState<'all' | 'under25' | '25to50' | 'over50'>('all');
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(0);

  const catColor = category.color ?? '#1F3A4D';
  const SubIcon = getCategoryIcon(subcategory.icon ?? category.icon);

  // ── Sticky Header Scroll Listener ──────────────────────────────
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 260);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Service Filtering & Sorting ────────────────────────────────
  const filteredServices = React.useMemo(() => {
    let result = [...subcategory.services];

    if (popularOnly) {
      result = result.filter((s) => s.isPopular);
    }

    if (priceFilter === 'under25') {
      result = result.filter((s) => s.minPricePence < 2500);
    } else if (priceFilter === '25to50') {
      result = result.filter((s) => s.minPricePence >= 2500 && s.minPricePence <= 5000);
    } else if (priceFilter === 'over50') {
      result = result.filter((s) => s.minPricePence > 5000);
    }

    if (sortBy === 'popular') {
      result.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    } else if (sortBy === 'price_low') {
      result.sort((a, b) => a.minPricePence - b.minPricePence);
    } else if (sortBy === 'price_high') {
      result.sort((a, b) => b.minPricePence - a.minPricePence);
    } else if (sortBy === 'duration') {
      result.sort((a, b) => a.durationMins - b.durationMins);
    }

    return result;
  }, [subcategory.services, popularOnly, priceFilter, sortBy]);

  const scrollToServices = () => {
    const el = document.getElementById('services-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-bg">
      {/* ── SECTION 1: STICKY SUB-HEADER (SCROLL DETECTED) ─────── */}
      <div
        className={`fixed inset-x-0 top-0 z-40 border-b border-hairline bg-white/95 backdrop-blur transition-all duration-300 ${
          isScrolled ? 'translate-y-0 opacity-100 shadow-sm' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="mx-auto flex max-w-page items-center justify-between px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: `${catColor}18` }}
            >
              <SubIcon className="h-4 w-4" style={{ color: catColor }} />
            </span>
            <div>
              <p className="text-[14px] font-extrabold text-ink leading-tight">
                {subcategory.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="flex items-center gap-0.5 font-bold text-amber-600">
                  <Star className="h-3 w-3 fill-current" /> 4.8
                </span>
                <span>•</span>
                <span>2,400+ bookings</span>
                {providers.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">{providers.length} pros nearby</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={scrollToServices}
            className="rounded-xl bg-accent px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-accent-hover active:scale-95"
          >
            Book a Service →
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-page px-4 pb-20 pt-6 lg:px-6">
        {/* ── BREADCRUMB & BACK LINK ────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-muted mb-3 font-medium flex-wrap">
          <Link href="/" className="hover:text-ink transition">Home</Link>
          <span>›</span>
          <Link href="/services" className="hover:text-ink transition">Services</Link>
          <span>›</span>
          <Link href={`/services/${category.slug}`} className="hover:text-ink transition">
            {category.name}
          </Link>
          <span>›</span>
          <span className="text-ink font-bold">{subcategory.name}</span>
        </div>

        <Link
          href={`/services/${category.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink mb-4 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {category.name}
        </Link>

        {/* ── SECTION 2: SUBCATEGORY HERO ───────────────────────── */}
        <section className="mb-8 rounded-3xl border border-input-border bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl shadow-inner"
                style={{ background: `${catColor}18` }}
              >
                <SubIcon className="h-8 w-8" style={{ color: catColor }} />
              </span>
              <div>
                <h1 className="text-[28px] font-extrabold text-ink lg:text-[34px] tracking-tight leading-none">
                  {subcategory.name}
                </h1>
                <p className="mt-2 text-[14px] text-muted leading-relaxed max-w-2xl">
                  {subcategory.description}
                </p>

                {/* Social Proof Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-muted">
                  <div className="flex items-center gap-1 font-extrabold text-ink bg-amber-500/10 px-2.5 py-1 rounded-lg">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span>4.8</span>
                    <span className="text-muted font-normal text-xs">(2,400+ reviews)</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <span className="font-medium">2,400+ completed bookings</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck className="h-4 w-4" /> Verified local professionals
                  </span>
                </div>
              </div>
            </div>

            {/* Key Chips */}
            <div className="flex flex-wrap lg:flex-col gap-2.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-hairline shrink-0">
              <div className="flex items-center gap-2 rounded-xl bg-bg px-3.5 py-2 text-[12px] font-semibold text-ink border border-hairline">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>ID & Background Verified</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-bg px-3.5 py-2 text-[12px] font-semibold text-ink border border-hairline">
                <Tag className="h-4 w-4 text-accent" />
                <span>Upfront transparent pricing</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-bg px-3.5 py-2 text-[12px] font-semibold text-ink border border-hairline">
                <Calendar className="h-4 w-4 text-amber-600" />
                <span>Same-day slot availability</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: QUICK FILTER BAR ───────────────────────── */}
        <section id="services-grid" className="sticky top-0 z-30 mb-6 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-y border-hairline shadow-sm lg:-mx-6 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-ink mr-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-accent" /> Filters:
              </span>

              {/* Popular Toggle Pill */}
              <button
                onClick={() => setPopularOnly(!popularOnly)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold transition ${
                  popularOnly
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-bg text-ink hover:bg-hairline border border-hairline'
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${popularOnly ? 'text-white' : 'text-accent'}`} />
                <span>Popular only</span>
              </button>

              {/* Price Filter */}
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as any)}
                className="rounded-xl border border-hairline bg-bg px-3 py-1.5 text-[12px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
              >
                <option value="all">Price: All</option>
                <option value="under25">Under £25</option>
                <option value="25to50">£25 - £50</option>
                <option value="over50">Over £50</option>
              </select>
            </div>

            {/* Sort Dropdown & Count */}
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-muted font-medium">
                {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1 text-[12px]">
                <span className="text-muted hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-hairline bg-bg px-3 py-1.5 text-[12px] font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                >
                  <option value="popular">Most Popular</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="duration">Fastest Duration</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: SERVICE CARDS GRID ─────────────────────── */}
        <section className="mb-14">
          {filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-white p-8 text-center">
              <p className="text-[15px] font-bold text-ink">No services match your active filters.</p>
              <p className="mt-1 text-[13px] text-muted">Try resetting your filter parameters to view all services.</p>
              <button
                onClick={() => {
                  setPopularOnly(false);
                  setPriceFilter('all');
                  setSortBy('popular');
                }}
                className="mt-4 rounded-xl bg-accent/10 px-4 py-2 text-[13px] font-bold text-accent hover:bg-accent/20 transition"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((service) => {
                const ServiceIcon = getCategoryIcon(service.icon ?? subcategory.icon);
                const detailUrl = `/services/${category.slug}/${subcategory.slug}/${service.slug}`;
                return (
                  <div
                    key={service.id}
                    className="group flex flex-col justify-between rounded-2xl border border-input-border bg-white p-5 shadow-sm transition-all hover:border-accent hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div>
                      {/* Top bar: Icon & Popular badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors group-hover:bg-accent/10"
                          style={{ background: `${catColor}12` }}
                        >
                          <ServiceIcon
                            className="h-5 w-5 transition-colors group-hover:text-accent"
                            style={{ color: catColor }}
                          />
                        </span>
                        {service.isPopular && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                            <Flame className="h-3 w-3 fill-current" /> Popular
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <Link href={detailUrl} className="block group-hover:text-accent transition-colors">
                        <h3 className="text-[16px] font-extrabold leading-tight text-ink">
                          {service.name}
                        </h3>
                      </Link>
                      <p className="mt-1.5 text-[12px] text-muted line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Footer Info & Action */}
                    <div className="mt-5 pt-3 border-t border-hairline">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 text-[12px] text-muted font-medium">
                          <Clock className="h-3.5 w-3.5 text-muted" />
                          <span>~{Math.round((service.durationMins / 60) * 10) / 10} hours</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-muted">From </span>
                          <span className="text-[16px] font-extrabold text-ink">
                            {pence(service.minPricePence)}
                          </span>
                        </div>
                      </div>

                      {/* Dual Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={detailUrl}
                          className="rounded-xl border border-hairline bg-bg px-3 py-2 text-center text-[12px] font-bold text-ink transition hover:bg-hairline hover:border-muted/30"
                        >
                          View details
                        </Link>
                        <Link
                          href={detailUrl}
                          className="rounded-xl bg-accent px-3 py-2 text-center text-[12px] font-bold text-white shadow-sm transition hover:bg-accent-hover"
                        >
                          Book now →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION 5: PROVIDER PREVIEW STRIP ─────────────────── */}
        {providers.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[20px] font-extrabold text-ink">
                  Available professionals near you
                </h2>
                <p className="text-[13px] text-muted mt-0.5">
                  {providers.length} verified professional{providers.length !== 1 ? 's' : ''} ready to assist in {category.name}
                </p>
              </div>
              <Link
                href={`/browse?category=${category.slug}`}
                className="hidden sm:inline-flex items-center gap-1 text-[13px] font-bold text-accent hover:text-accent-hover transition"
              >
                See all providers →
              </Link>
            </div>

            {/* Horizontal Scroll Strip */}
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none -mx-4 px-4 lg:-mx-6 lg:px-6">
              {providers.map((p) => {
                const rating = p.provider?.rating_avg ?? 4.9;
                const count = p.provider?.rating_count ?? 12;
                return (
                  <div
                    key={p.id}
                    className="flex w-64 shrink-0 flex-col justify-between rounded-2xl border border-hairline bg-white p-4 shadow-sm transition hover:border-accent"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-bg shrink-0 flex items-center justify-center border border-hairline shadow-sm">
                          {p.provider?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[16px] font-bold text-ink">
                              {(p.provider?.full_name ?? 'P')[0]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-ink text-[14px] truncate">
                            {p.provider?.full_name ?? 'Verified Professional'}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>{rating.toFixed(1)}</span>
                            <span className="text-muted font-normal">({count} jobs)</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-hairline pt-2.5">
                        <p className="text-[12px] font-bold text-ink truncate">{p.title}</p>
                        <p className="text-[11px] font-semibold text-accent mt-0.5">
                          From {pence(p.price_pence)}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/book/${p.id}`}
                      className="mt-4 block rounded-xl bg-bg border border-hairline py-2 text-center text-[12px] font-bold text-ink transition hover:bg-accent hover:text-white hover:border-accent"
                    >
                      Book professional
                    </Link>
                  </div>
                );
              })}

              {/* "See All" Card at end of strip */}
              <Link
                href={`/browse?category=${category.slug}`}
                className="flex w-48 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-white/60 p-6 text-center shadow-sm transition hover:border-accent hover:bg-accent/5 group"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent group-hover:scale-110 transition-transform">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <p className="mt-3 text-[13px] font-bold text-ink group-hover:text-accent">
                  See all {providers.length}+ professionals
                </p>
                <p className="text-[11px] text-muted mt-0.5">Browse profiles & reviews</p>
              </Link>
            </div>
          </section>
        )}

        {/* ── SECTION 6: TRUST PILLARS ──────────────────────────── */}
        <section className="mb-14 rounded-3xl border border-input-border bg-white p-6 shadow-sm lg:p-8">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-accent">
              Urban Assist Guarantee
            </span>
            <h2 className="mt-2 text-[22px] font-extrabold text-ink lg:text-[26px]">
              Why book your {subcategory.name.toLowerCase()} with us?
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-bg/50 border border-hairline">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Verified & DBS Checked</h3>
              <p className="mt-1.5 text-[12px] text-muted leading-relaxed">
                Every professional undergo strict identity verification, reference checks, and DBS background screening.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-bg/50 border border-hairline">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent mb-3">
                <Tag className="h-6 w-6" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Fixed Upfront Pricing</h3>
              <p className="mt-1.5 text-[12px] text-muted leading-relaxed">
                No hidden call-out fees or unexpected charges. Prices are confirmed transparently before you confirm.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-bg/50 border border-hairline">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 mb-3">
                <Calendar className="h-6 w-6" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Free Cancellation</h3>
              <p className="mt-1.5 text-[12px] text-muted leading-relaxed">
                Plans change. Cancel or reschedule your booking free of charge up to 2 hours before the professional arrives.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: FAQ ACCORDION ──────────────────────────── */}
        {faqs.length > 0 && (
          <section className="mb-14 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-[20px] font-extrabold text-ink lg:text-[24px]">
                Frequently asked questions
              </h2>
              <p className="text-[13px] text-muted mt-1">
                Everything you need to know about {subcategory.name.toLowerCase()}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-hairline bg-white shadow-sm transition overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between p-4 text-left text-[14px] font-bold text-ink hover:text-accent transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <HelpCircle className="h-4 w-4 text-accent shrink-0" />
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-[13px] text-muted leading-relaxed border-t border-hairline/50 bg-bg/30">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── SECTION 8: RELATED SUBCATEGORIES ───────────────────── */}
        {siblingSubcategories.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-extrabold text-ink">
                Also in {category.name}
              </h2>
              <Link
                href={`/services/${category.slug}`}
                className="text-[12px] font-bold text-accent hover:text-accent-hover transition"
              >
                View all {category.name.toLowerCase()} →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {siblingSubcategories.map((sibling) => {
                const SiblingIcon = getCategoryIcon(sibling.icon ?? category.icon);
                return (
                  <Link
                    key={sibling.id}
                    href={`/services/${category.slug}/${sibling.slug}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-input-border bg-white p-4 shadow-sm transition-all hover:border-accent hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl transition-colors group-hover:bg-accent/10"
                        style={{ background: `${catColor}14` }}
                      >
                        <SiblingIcon className="h-5 w-5" style={{ color: catColor }} />
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
                    </div>
                    <div>
                      <p className="text-[13px] font-extrabold text-ink group-hover:text-accent transition-colors leading-tight">
                        {sibling.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted font-medium">
                        {sibling.services.length} service{sibling.services.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
