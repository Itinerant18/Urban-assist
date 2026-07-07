'use client';
import { MapPin, Search, ChevronDown, Wrench, Sparkles, PaintBucket, Bug, Zap, Shirt, Wind, Shovel, Grid3X3, Star, ArrowRight, Gift, ChevronRight, Home, CalendarClock, Wallet, User, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import type { HomepageData, HomepageCategory, HomepageService, HomepageReview } from '../lib/homepage-data';
import { getCategoryIcon } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';

/* ── Props ──────────────────────────────────────────────── */

interface MobileHomeProps {
  data: HomepageData;
}

/* ── Sticky Bottom Nav ─────────────────────────────────── */

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white lg:hidden">
      <ul className="mx-auto flex max-w-lg items-center justify-around py-1.5">
        {[
          { icon: Home, label: 'Home', href: '/', active: true },
          { icon: CalendarClock, label: 'Bookings', href: '/bookings' },
          { icon: Wallet, label: 'Wallet', href: '#' },
          { icon: User, label: 'Profile', href: '/account' },
        ].map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-4 py-1"
            >
              <item.icon className={`h-5 w-5 ${item.active ? 'text-accent' : 'text-muted'}`} />
              <span className={`text-[10px] font-semibold ${item.active ? 'text-accent' : 'text-muted'}`}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── Mobile Header ─────────────────────────────────────── */

function MobileHeader() {
  return (
    <header className="lg:hidden" style={{ background: '#1F3A4D' }}>
      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </span>
          <div className="flex items-center gap-1 text-white">
            <MapPin className="h-3.5 w-3.5 text-amber" />
            <span className="text-[12px] font-semibold">Current Location</span>
            <ChevronDown className="h-3 w-3 text-white/60" />
          </div>
        </div>
        <p className="mb-3 text-[11px] text-white/60">Select Delivery/Service Address...</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search for services..."
            className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-[13px] text-ink placeholder:text-muted focus:outline-none"
            style={{ minHeight: 40 }}
          />
        </div>
      </div>
    </header>
  );
}

/* ── Mobile Hero ────────────────────────────────────────── */

function MobileHero({ promoCode }: { promoCode: HomepageData['promoCode'] }) {
  return (
    <section className="lg:hidden bg-white px-4 pb-2 pt-4">
      <div className="rounded-2xl overflow-hidden" style={{ background: '#F5F1EB' }}>
        <div className="flex flex-col p-5">
          <span className="inline-block self-start rounded-full bg-accent/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-accent">
            Limited offer
          </span>
          <h2 className="mt-2 text-[20px] font-extrabold leading-tight text-ink">
            Up to 50% Off<br />On First Booking!
          </h2>
          {promoCode && (
            <p className="mt-1 text-[12px] text-muted">
              Use code <strong className="text-accent">{promoCode.code}</strong>
            </p>
          )}
          <div className="mt-3 h-32 w-full rounded-xl bg-hairline/40" />
        </div>
      </div>
    </section>
  );
}

/* ── Quick Service Grid (4x2) ──────────────────────────── */

function QuickServiceGrid({ categories }: { categories: HomepageCategory[] }) {
  const tiles = categories.slice(0, 7).map((cat) => ({
    icon: getCategoryIcon(cat.icon),
    label: cat.name,
    href: `/services?category=${cat.slug}`,
    color: ['#C1622E', '#6B8F6B', '#1F3A4D', '#D9A441', '#C1622E', '#6B8F6B', '#1F3A4D'][categories.indexOf(cat) % 7] ?? '#6B6A62',
  }));
  tiles.push({ icon: Grid3X3, label: 'All Services', href: '/services', color: '#6B6A62' });

  return (
    <section className="lg:hidden bg-white px-4 py-4">
      <div className="grid grid-cols-4 gap-3">
        {tiles.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="flex flex-col items-center gap-1.5">
              <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${s.color}12` }}>
                <Icon className="h-5 w-5" style={{ color: s.color }} />
              </span>
              <span className="text-[10px] font-semibold text-center leading-tight text-ink">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ── Horizontal Scroll Section ──────────────────────────── */

function HorizScroll({ title, items, showPrice, showRating }: {
  title: string;
  items: HomepageService[];
  showPrice?: boolean;
  showRating?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="lg:hidden bg-white pb-2 pt-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <h3 className="text-[16px] font-extrabold text-ink">{title}</h3>
        <a href="/services" className="flex items-center gap-0.5 text-[12px] font-semibold text-accent">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => (
          <Link key={item.id} href={`/services?category=${item.categorySlug}`} className="w-36 shrink-0 snap-start">
            <div className="h-24 w-full rounded-xl bg-hairline/40" />
            <div className="mt-2">
              <span className="text-[12px] font-bold text-ink">{item.title}</span>
              {item.categoryName && <p className="text-[10px] text-muted">{item.categoryName}</p>}
              {showRating && item.rating && (
                <div className="mt-0.5 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber text-amber" />
                  <span className="text-[10px] font-semibold text-muted">{item.rating}</span>
                  {item.reviewCount && <span className="text-[9px] text-muted">({item.reviewCount})</span>}
                </div>
              )}
              {showPrice && <span className="text-[13px] font-extrabold text-ink">{pence(item.pricePence)}</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── In The Spotlight ───────────────────────────────────── */

function Spotlight() {
  return (
    <section className="lg:hidden bg-white px-4 py-4">
      <h3 className="mb-3 text-[16px] font-extrabold text-ink">In the Spotlight</h3>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#E4D4C4' }}>
        <div className="p-5">
          <span className="inline-block rounded-full bg-white/30 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-ink">
            Flat discount
          </span>
          <h4 className="mt-2 text-[18px] font-extrabold text-ink">Upgrade to Luxe for 15% more</h4>
          <div className="my-3 h-28 w-full rounded-xl bg-hairline/50" />
          <a href="/coming-soon" className="inline-block rounded-lg bg-accent px-5 py-2.5 text-[13px] font-bold text-white">
            Book Now
          </a>
        </div>
        <div className="flex justify-center gap-2 pb-4">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="h-2 w-2 rounded-full bg-white/40" />
          <span className="h-2 w-2 rounded-full bg-white/40" />
        </div>
      </div>
    </section>
  );
}

/* ── Stacked Promo Cards ────────────────────────────────── */

function StackedPromos() {
  return (
    <section className="lg:hidden bg-white space-y-3 px-4 py-2 pb-4">
      {[
        { title: 'Get squeaky clean bathrooms', label: null, cta: 'Learn More', bg: '#E8F0E8' },
        { title: 'Salon Finish at home', label: 'Trending', cta: 'Book Salon', bg: '#EEEAFF' },
        { title: 'Designed to be bold. Built to protect.', label: 'Launch', cta: 'Buy Now', bg: '#F5F1EB' },
      ].map((card) => (
        <div key={card.title} className="relative rounded-2xl overflow-hidden" style={{ background: card.bg }}>
          <div className="p-5">
            {card.label && (
              <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-accent">
                {card.label}
              </span>
            )}
            <h4 className="mt-2 text-[16px] font-extrabold text-ink max-w-[70%]">{card.title}</h4>
            <div className="mt-2 h-20 w-full rounded-xl bg-hairline/40" />
            <a href="/coming-soon" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-white">
              {card.cta}
            </a>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ── Categorized Lists ──────────────────────────────────── */

function CategorizedLists({ trending }: { trending: HomepageService[] }) {
  if (trending.length === 0) return null;

  const groups: Record<string, HomepageService[]> = {};
  for (const s of trending) {
    if (!groups[s.categoryName]) groups[s.categoryName] = [];
    groups[s.categoryName].push(s);
  }

  const entries = Object.entries(groups).slice(0, 2);

  return (
    <section className="lg:hidden bg-white space-y-6 px-4 py-4">
      {entries.length === 0 ? null : entries.map(([catTitle, items]) => (
        <div key={catTitle}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[16px] font-extrabold text-ink">{catTitle}</h3>
            <a href={`/services?category=${items[0]?.categorySlug ?? ''}`} className="flex items-center gap-0.5 text-[12px] font-semibold text-accent">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <Link key={item.id} href={`/services?category=${item.categorySlug}`} className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-hairline/40" />
                <div>
                  <span className="text-[13px] font-bold text-ink">{item.title}</span>
                  <p className="text-[13px] font-extrabold text-ink">{pence(item.pricePence)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ── Referral Card ──────────────────────────────────────── */

function ReferralCard() {
  return (
    <section className="lg:hidden bg-white px-4 py-3">
      <div className="rounded-2xl border border-hairline bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-[15px] font-extrabold text-ink">Great service deserves to be shared</h3>
            <p className="mt-1 text-[12px] text-muted">Invite your friends to try Urban Assist!</p>
            <a href="/coming-soon" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-white">
              Invite Now
            </a>
          </div>
          <div className="ml-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
            <Gift className="h-8 w-8 text-accent" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials (mobile) ──────────────────────────────── */

function MobileTestimonials({ reviews }: { reviews: HomepageReview[] }) {
  if (reviews.length === 0) return null;
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <section className="lg:hidden bg-white px-4 py-4">
      <h3 className="mb-3 text-[16px] font-extrabold text-ink">What customers say</h3>
      <div className="space-y-3">
        {reviews.slice(0, 2).map((r) => (
          <div key={r.id} className="rounded-xl border border-hairline p-4">
            <div className="text-[14px] tracking-[2px]" style={{ color: '#D9A441' }}>
              {stars(r.rating)}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink">{r.comment}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[13px] font-bold text-ink">{r.authorName}</span>
              <span className="text-[10px] text-muted">{r.location}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Mobile Footer ──────────────────────────────────────── */

function MobileFooter() {
  const [open, setOpen] = useState<string | null>(null);
  const sections = {
    'Quick Links': ['About Us', 'Careers', 'Privacy Policy', 'Impact'],
    'For Customers': ['All Services', 'Categories Near Me', 'Contact Support'],
    'For Professionals': ['Register as a Partner', 'Download Partner App'],
  };

  return (
    <footer className="lg:hidden pb-20" style={{ background: '#1F3A4D' }}>
      <div className="px-4 py-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="block h-9 w-9 rounded-[9px] border border-white/20 bg-hairline/20" />
          <span className="text-[15px] font-extrabold text-[#F5F1EB]">Urban Assist</span>
        </div>

        {Object.entries(sections).map(([heading, links]) => {
          const isOpen = open === heading;
          return (
            <div key={heading} className="border-b border-white/10">
              <button
                className="flex w-full items-center justify-between py-3 text-[13px] font-bold text-[#F5F1EB]"
                onClick={() => setOpen(isOpen ? null : heading)}
              >
                {heading}
                <ChevronUp className={`h-4 w-4 text-white/60 transition ${isOpen ? '' : 'rotate-180'}`} />
              </button>
              {isOpen && (
                <ul className="space-y-2 pb-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="/coming-soon" className="text-[12px] text-[#9FB1BC]">{link}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <div className="mt-6 flex gap-4">
          {['f', 't', 'i', 'in'].map((s) => (
            <a key={s} href="/coming-soon" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/70">
              {s}
            </a>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <a href="/coming-soon" className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-center text-[12px] font-bold text-white backdrop-blur">
            App Store
          </a>
          <a href="/coming-soon" className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-center text-[12px] font-bold text-white backdrop-blur">
            Google Play
          </a>
        </div>

        <p className="mt-6 text-[10px] text-[#7E93A0] text-center">
          &copy; 2026 Urban Assist Private Limited.
        </p>
      </div>
    </footer>
  );
}

/* ── Exported MobileHome ────────────────────────────────── */

export function MobileHome({ data }: MobileHomeProps) {
  const { categories, reviews, trending, mostBooked, promoCode } = data;

  return (
    <>
      <MobileHeader />
      <MobileHero promoCode={promoCode} />
      <QuickServiceGrid categories={categories} />
      <HorizScroll title="Trending Near You" items={trending.slice(0, 4)} showRating />
      <Spotlight />
      <HorizScroll title="New and Noteworthy" items={trending.slice(2, 6)} showPrice />
      <HorizScroll title="Most Booked Services" items={mostBooked.slice(0, 3)} showPrice showRating />
      <StackedPromos />
      <CategorizedLists trending={trending} />
      <MobileTestimonials reviews={reviews} />
      <ReferralCard />
      <MobileFooter />
      <BottomNav />
    </>
  );
}
