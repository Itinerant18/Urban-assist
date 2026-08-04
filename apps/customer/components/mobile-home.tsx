'use client';

import {
  ArrowRight,
  BadgePoundSterling,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  MapPin,
  Quote,
  ShieldCheck,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import type {
  HomepageCategory,
  HomepageData,
  HomepageReview,
  HomepageService,
} from '../lib/homepage-data';
import { getCategoryIcon } from '../lib/homepage-data';
import { PostcodeGate } from './postcode-gate';

interface MobileHomeProps {
  data: HomepageData;
}

function MobileHeader() {
  return (
    <header className="bg-ink text-white lg:hidden">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/" className="tap flex items-center gap-2.5 rounded-lg" aria-label="Urban Assist home">
          <Logo inverted />
          <span className="text-[15px] font-extrabold tracking-[-0.01em]">Urban Assist</span>
        </Link>
        <Link
          href="/login"
          className="tap inline-flex items-center rounded-full border border-white/25 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/10"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

function MobileIntro({ promoCode }: { promoCode: HomepageData['promoCode'] }) {
  return (
    <section className="bg-ink px-4 pb-7 text-white lg:hidden">
      <div className="max-w-md">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-footer-muted">
          <MapPin className="h-4 w-4 text-amber" aria-hidden="true" />
          London &amp; the South East
        </p>
        <h1 className="mt-4 max-w-[18rem] text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white text-balance">
          What needs sorting at home?
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-6 text-[#D7E0E5] text-pretty">
          Fixed prices, vetted professionals and a time that works for you.
        </p>
        <PostcodeGate
          variant="compact"
          className="mt-5"
          placeholder="e.g. SW1A 1AA"
        />
        <p className="mt-2 text-[12px] leading-5 text-footer-muted">
          Enter your postcode to see services and availability nearby.
        </p>

        {promoCode && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
            <BadgePoundSterling className="h-5 w-5 shrink-0 text-amber" aria-hidden="true" />
            <p className="text-[12px] leading-5 text-white">
              First booking offer: use <strong className="font-extrabold">{promoCode.code}</strong> at checkout.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function TrustStrip() {
  const promises = [
    { label: 'Vetted pros', icon: ShieldCheck },
    { label: 'Fixed prices', icon: BadgePoundSterling },
    { label: 'Easy booking', icon: CalendarCheck2 },
  ];

  return (
    <section className="border-b border-hairline bg-white px-4 py-3 lg:hidden" aria-label="Urban Assist promise">
      <ul className="grid grid-cols-3 gap-2">
        {promises.map(({ label, icon: Icon }) => (
          <li key={label} className="flex min-w-0 items-center justify-center gap-1.5 text-center">
            <Icon className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span className="text-[11px] font-bold leading-4 text-ink">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ServiceCategories({ categories }: { categories: HomepageCategory[] }) {
  const visibleCategories = categories.slice(0, 7);

  if (visibleCategories.length === 0) return null;

  return (
    <section className="bg-bg px-4 py-7 lg:hidden" aria-labelledby="mobile-categories-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="mobile-categories-title" className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">
            Services for your home
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">Start with the job you need done.</p>
        </div>
        <Link
          href="/services"
          className="tap inline-flex shrink-0 items-center gap-1 rounded-lg text-[13px] font-bold text-accent-hover hover:text-ink"
        >
          View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {visibleCategories.map((category) => {
          const Icon = getCategoryIcon(category.icon);
          return (
            <Link
              key={category.id}
              href={`/services/${category.slug}`}
              className="group flex min-h-[84px] min-w-0 flex-col items-center justify-start gap-2 rounded-xl px-1 py-2 text-center transition-colors hover:bg-white focus-visible:bg-white"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-ink ring-1 ring-input-border transition-colors group-hover:text-accent group-hover:ring-accent/40">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="line-clamp-2 text-[11px] font-bold leading-[1.25] text-charcoal">
                {category.name}
              </span>
            </Link>
          );
        })}
        <Link
          href="/services"
          className="group flex min-h-[84px] min-w-0 flex-col items-center justify-start gap-2 rounded-xl px-1 py-2 text-center transition-colors hover:bg-white focus-visible:bg-white"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white">
            <Grid3X3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-bold leading-[1.25] text-charcoal">All services</span>
        </Link>
      </div>
    </section>
  );
}

function PopularServices({ items }: { items: HomepageService[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-white px-4 py-7 lg:hidden" aria-labelledby="popular-services-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="popular-services-title" className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">
            Most booked
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">Clear starting prices, before you commit.</p>
        </div>
        <Link href="/services" className="tap inline-flex shrink-0 items-center text-[13px] font-bold text-accent-hover hover:text-ink">
          See all
        </Link>
      </div>

      <div className="divide-y divide-hairline border-y border-hairline">
        {items.slice(0, 4).map((item) => {
          const Icon = getCategoryIcon(item.icon);
          return (
            <Link
              key={item.id}
              href={`/services/${item.categorySlug}`}
              className="group flex min-h-[84px] items-center gap-3 py-3"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg text-ink transition-colors group-hover:text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[14px] font-bold leading-5 text-charcoal">{item.title}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{item.categoryName}</span>
                {item.rating && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted">
                    <Star className="h-3.5 w-3.5 fill-amber text-amber" aria-hidden="true" />
                    {item.rating.toFixed(1)}
                    {item.reviewCount ? <span>({item.reviewCount})</span> : null}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[11px] font-medium text-muted">From</span>
                <span className="block text-[14px] font-extrabold text-ink">{pence(item.pricePence)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: 'Choose a service', detail: 'See the price before booking.' },
    { title: 'Pick a time', detail: 'Choose a visit window that suits you.' },
    { title: 'We match your pro', detail: 'A vetted professional is assigned.' },
  ];

  return (
    <section className="bg-bg px-4 py-7 lg:hidden" aria-labelledby="how-it-works-title">
      <h2 id="how-it-works-title" className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">
        Book without the phone-tag
      </h2>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-extrabold text-white">
              {index + 1}
            </span>
            <div className="pt-0.5">
              <h3 className="text-[14px] font-bold text-charcoal">{step.title}</h3>
              <p className="mt-0.5 text-[13px] leading-5 text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link
        href="/services"
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-hover px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-ink"
      >
        Browse services <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function CustomerProof({ reviews }: { reviews: HomepageReview[] }) {
  const review = reviews[0];
  if (!review) return null;

  return (
    <section className="bg-white px-4 py-7 lg:hidden" aria-labelledby="customer-proof-title">
      <div className="rounded-2xl bg-ink px-5 py-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <h2 id="customer-proof-title" className="text-[18px] font-extrabold">Trusted in real homes</h2>
          <Quote className="h-6 w-6 text-amber" aria-hidden="true" />
        </div>
        <div className="mt-4 flex items-center gap-1 text-amber" role="img" aria-label={`${review.rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              className={`h-4 w-4 ${index < review.rating ? 'fill-amber' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <blockquote className="mt-3 text-[14px] leading-6 text-white text-pretty">
          “{review.comment}”
        </blockquote>
        <p className="mt-4 text-[12px] font-semibold text-footer-muted">
          {review.authorName} · {review.location}
        </p>
      </div>
    </section>
  );
}

function MobileFooter() {
  const [open, setOpen] = useState<string | null>(null);
  const sections = [
    {
      heading: 'Urban Assist',
      links: [
        { label: 'About us', href: '/about' },
        { label: 'Help centre', href: '/help' },
      ],
    },
    {
      heading: 'For customers',
      links: [
        { label: 'All services', href: '/services' },
        { label: 'My bookings', href: '/bookings' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy policy', href: '/privacy' },
        { label: 'Terms of service', href: '/terms' },
      ],
    },
  ];

  return (
    <footer className="bg-ink pb-[calc(5.25rem+env(safe-area-inset-bottom))] text-white lg:hidden">
      <div className="px-4 py-7">
        <div className="mb-5 flex items-center gap-2.5">
          <Logo inverted />
          <div>
            <p className="text-[15px] font-extrabold">Urban Assist</p>
            <p className="text-[11px] text-footer-muted">Trusted help for your home.</p>
          </div>
        </div>

        {sections.map(({ heading, links }) => {
          const isOpen = open === heading;
          return (
            <div key={heading} className="border-t border-white/15">
              <button
                type="button"
                className="tap flex w-full items-center justify-between py-3 text-left text-[13px] font-bold"
                onClick={() => setOpen(isOpen ? null : heading)}
                aria-expanded={isOpen}
              >
                {heading}
                <ChevronDown
                  className={`h-4 w-4 text-footer-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <ul className="space-y-1 pb-3">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="tap inline-flex items-center text-[12px] text-footer-muted hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <p className="mt-5 border-t border-white/15 pt-5 text-[11px] leading-5 text-footer-muted">
          © 2026 Urban Assist Services Ltd. Registered in England &amp; Wales.
        </p>
      </div>
    </footer>
  );
}

export function MobileHome({ data }: MobileHomeProps) {
  const { categories, reviews, mostBooked, trending, promoCode } = data;
  const popular = mostBooked.length > 0 ? mostBooked : trending;

  return (
    <div className="min-h-dvh bg-bg lg:hidden">
      <MobileHeader />
      <main>
        <MobileIntro promoCode={promoCode} />
        <TrustStrip />
        <ServiceCategories categories={categories} />
        <PopularServices items={popular} />
        <HowItWorks />
        <CustomerProof reviews={reviews} />
      </main>
      <MobileFooter />
    </div>
  );
}
