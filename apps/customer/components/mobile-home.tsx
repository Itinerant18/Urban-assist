'use client';

// Mobile home, structured after Urban Company's app home (category icon card,
// horizontal most-booked cards, promo banner, big section headings + "See all"
// pills) but skinned entirely in Urban Assist tokens. Dark intro stays: it is
// the brand's signature moment; UC's utility-first rhythm takes over below it.

import {
  ArrowRight,
  BadgePoundSterling,
  CalendarCheck2,
  ChevronDown,
  Grid3X3,
  MapPin,
  Quote,
  ShieldCheck,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo, Reveal, ServiceImage } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import type {
  HomepageCategory,
  HomepageData,
  HomepageReview,
  HomepageService,
} from '../lib/homepage-data';
import { PostcodeGate } from './postcode-gate';
import { ReviewAvatar } from './review-avatar';

interface MobileHomeProps {
  data: HomepageData;
}

function SectionHeading({
  title,
  href,
  hrefLabel = 'See all',
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="tap shrink-0 rounded-lg border border-hairline bg-white px-3 py-1.5 text-[12px] font-bold text-ink transition active:scale-[0.98]"
        >
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}

function MobileIntro() {
  return (
    <section className="bg-ink px-4 pb-6 text-white lg:hidden">
      <Reveal>
        <div className="max-w-md">
          <p className="flex items-center gap-1.5 font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-amber">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            London &amp; the South East
          </p>
          <h1 className="mt-3 max-w-[18rem] text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white text-balance">
            What needs sorting at home?
          </h1>
          <PostcodeGate variant="compact" className="mt-4" placeholder="e.g. SW1A 1AA" />
          <p className="mt-2 text-[12px] leading-5 text-footer-muted">
            Enter your postcode to see services and availability nearby.
          </p>
        </div>
      </Reveal>
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
            <Icon className="h-4 w-4 shrink-0 text-success-deep" aria-hidden="true" />
            <span className="text-[11px] font-bold leading-4 text-ink">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** UC-style category card: icon tiles in one white card, price chip per tile. */
function ServiceCategories({ categories }: { categories: HomepageCategory[] }) {
  const visibleCategories = categories.slice(0, 8);

  if (visibleCategories.length === 0) return null;

  return (
    <section className="bg-bg px-4 py-6 lg:hidden" aria-labelledby="mobile-categories-title">
      <h2 id="mobile-categories-title" className="sr-only">
        Services for your home
      </h2>
      <Reveal>
        <div className="rounded-2xl border border-hairline bg-white p-4">
          <div className="grid grid-cols-3 gap-x-2 gap-y-5">
            {visibleCategories.map((category) => (
              <Link
                key={category.id}
                href={`/services/${category.slug}`}
                className="tap group flex min-w-0 flex-col items-center gap-1.5 text-center transition active:scale-[0.98]"
              >
                <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-bg">
                  <span className="relative h-14 w-14">
                    <ServiceImage slug={category.slug} caption="" />
                  </span>
                </span>
                <span className="line-clamp-2 text-[11px] font-bold leading-[1.25] text-charcoal">
                  {category.name}
                </span>
                <span className="font-mono-utility text-[10px] font-semibold text-success-deep">
                  £{Math.round(category.minPricePence / 100)}+
                </span>
              </Link>
            ))}
            <Link
              href="/services"
              className="tap group flex min-w-0 flex-col items-center gap-1.5 text-center transition active:scale-[0.98]"
            >
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink text-white">
                <Grid3X3 className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-bold leading-[1.25] text-charcoal">
                All services
              </span>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function PromoBanner({ promoCode }: { promoCode: HomepageData['promoCode'] }) {
  if (!promoCode) return null;

  return (
    <section className="bg-bg px-4 pb-6 lg:hidden" aria-label="First booking offer">
      <Reveal>
        <Link
          href="/services"
          className="tap block overflow-hidden rounded-2xl bg-accent px-5 py-4 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold leading-snug text-white">
                Save on your first booking
              </p>
              <p className="mt-1 text-[12px] leading-5 text-white/85">
                Use code{' '}
                <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono-utility font-bold text-white">
                  {promoCode.code}
                </span>{' '}
                at checkout
              </p>
            </div>
            <span className="shrink-0 rounded-xl bg-white px-4 py-2 text-[12px] font-bold text-accent-deep">
              Book now
            </span>
          </div>
        </Link>
      </Reveal>
    </section>
  );
}

/** UC-style horizontal card row: image top, title, rating, price. */
function MostBooked({ items }: { items: HomepageService[] }) {
  // One card per category: with a small marketplace the raw list repeats the
  // same service art back to back, which reads as a rendering bug.
  const unique = items.filter(
    (item, i) => items.findIndex((other) => other.categorySlug === item.categorySlug) === i,
  );
  if (unique.length === 0) return null;

  return (
    <section className="bg-white px-4 py-6 lg:hidden" aria-labelledby="most-booked-title">
      <div id="most-booked-title" className="contents">
        <SectionHeading title="Most booked services" href="/services" />
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
        {unique.slice(0, 6).map((item, i) => (
          <Link
            key={item.id}
            href={`/services/${item.categorySlug}`}
            className="tap w-[220px] shrink-0 snap-start transition active:scale-[0.98]"
          >
            <Reveal index={i}>
              <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-hairline bg-bg p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/services/${item.categorySlug}.webp`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-[14px] font-bold leading-5 text-charcoal">
                {item.title}
              </p>
              {item.rating ? (
                <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted">
                  <Star className="h-3.5 w-3.5 fill-amber text-amber" aria-hidden="true" />
                  {item.rating.toFixed(2)}
                  {item.reviewCount ? <span>({item.reviewCount})</span> : null}
                </p>
              ) : (
                <p className="mt-1 text-[12px] text-muted">{item.categoryName}</p>
              )}
              <p className="mt-1 font-mono-utility text-[14px] font-extrabold text-ink">
                {pence(item.pricePence)}
              </p>
            </Reveal>
          </Link>
        ))}
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
      <h2 id="how-it-works-title" className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
        Book without the phone-tag
      </h2>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="w-8 shrink-0 text-[28px] font-extrabold leading-none text-ink/15">
              0{index + 1}
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
        className="tap mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-accent-hover active:scale-[0.99]"
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
        <p className="mt-4 flex items-center gap-2.5 text-[12px] font-semibold text-footer-muted">
          <ReviewAvatar name={review.authorName} src={review.avatarUrl} className="h-7 w-7 text-[10px]" />
          <span>
            {review.authorName} · {review.location}
          </span>
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
    // bottom padding = tab-bar clearance + 1.75rem breathing room, derived not hardcoded
    <footer className="bg-ink pb-[calc(var(--tabbar-clearance)+1.75rem+env(safe-area-inset-bottom))] text-white lg:hidden">
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
      <main>
        <MobileIntro />
        <TrustStrip />
        <ServiceCategories categories={categories} />
        <PromoBanner promoCode={promoCode} />
        <MostBooked items={popular} />
        <HowItWorks />
        <CustomerProof reviews={reviews} />
      </main>
      <MobileFooter />
    </div>
  );
}
