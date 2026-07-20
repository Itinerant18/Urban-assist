'use client';
import { MapPin, ChevronDown, Grid3X3, Star, ArrowRight, Gift, Home, CalendarClock, HelpCircle, User, ChevronUp, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import type { HomepageData, HomepageCategory, HomepageService, HomepageReview } from '../lib/homepage-data';
import { Logo } from '@urban-assist/ui';
import { getCategoryIcon } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';
import { PostcodeGate } from './postcode-gate';

/* ── Props ──────────────────────────────────────────────── */

interface MobileHomeProps {
  data: HomepageData;
}

/* ── Sticky Bottom Nav ─────────────────────────────────── */

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-lg items-center justify-around py-1.5">
        {[
          { icon: Home, label: 'Home', href: '/', active: true },
          { icon: CalendarClock, label: 'Bookings', href: '/bookings' },
          { icon: ShoppingCart, label: 'Cart', href: '/cart' },
          { icon: User, label: 'Menu', href: '/account' },
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
        <PostcodeGate variant="compact" placeholder="Enter your postcode…" />
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

/* ── Quick Service Grid (Bento Grid 2-column) ──────────── */

function QuickServiceGrid({ categories }: { categories: HomepageCategory[] }) {
  const badgeColors: Record<string, { bg: string; label: string }> = {
    sparkles: { bg: '#6B8F6B', label: 'Top Rated' },
    wrench: { bg: '#C1622E', label: 'Popular' },
    zap: { bg: '#D9A441', label: 'Popular' },
    settings: { bg: '#C1622E', label: 'Trending' },
    leaf: { bg: '#6B8F6B', label: 'Trending' },
    hammer: { bg: '#1F3A4D', label: 'Popular' },
    paintbrush: { bg: '#1F3A4D', label: 'Popular' },
    lock: { bg: '#1F3A4D', label: 'New' },
  };

  const getStripeStyle = (type: 'A' | 'B') => {
    if (type === 'B') {
      return {
        background: 'repeating-linear-gradient(135deg, #E9F0E9, #E9F0E9 10px, #DEE9DE 10px, #DEE9DE 20px)',
      };
    }
    return {
      background: 'repeating-linear-gradient(135deg, #EDE6D8, #EDE6D8 10px, #E4DBC9 10px, #E4DBC9 20px)',
    };
  };

  const cleaning = categories.find((c) => c.slug.includes('cleaning') || c.id === 'cleaning') || categories[0];
  const plumbing = categories.find((c) => c.slug.includes('plumbing') || c.id === 'plumbing') || categories[1];
  const electrical = categories.find((c) => c.slug.includes('electrical') || c.id === 'electrical') || categories[2];
  const heating = categories.find((c) => c.slug.includes('heating') || c.id === 'heating') || categories[3];
  const handyman = categories.find((c) => c.slug.includes('handyman') || c.id === 'handyman') || categories[4];
  const painting = categories.find((c) => c.slug.includes('painting') || c.id === 'painting') || categories[5];
  const gardening = categories.find((c) => c.slug.includes('gardening') || c.id === 'gardening') || categories[6];

  if (!cleaning || !plumbing) {
    return null;
  }

  const tiles = [
    {
      id: cleaning.id,
      type: 'feature' as const,
      category: cleaning,
      slug: cleaning.slug,
      name: cleaning.name,
      icon: cleaning.icon,
      stripeType: 'B' as const,
      caption: 'Cleaning',
      badge: { bg: '#6B8F6B', label: 'Top Rated' },
      spanClass: 'col-span-2',
    },
    {
      id: plumbing.id,
      type: 'standard' as const,
      category: plumbing,
      slug: plumbing.slug,
      name: plumbing.name,
      icon: plumbing.icon,
      stripeType: 'A' as const,
      caption: 'Plumbing',
      badge: badgeColors[plumbing.icon],
      spanClass: 'col-span-1',
    },
    {
      id: electrical.id,
      type: 'standard' as const,
      category: electrical,
      slug: electrical.slug,
      name: electrical.name,
      icon: electrical.icon,
      stripeType: 'A' as const,
      caption: 'Electrical',
      badge: badgeColors[electrical.icon],
      spanClass: 'col-span-1',
    },
    {
      id: heating.id,
      type: 'standard' as const,
      category: heating,
      slug: heating.slug,
      name: heating.name,
      icon: heating.icon,
      stripeType: 'A' as const,
      caption: 'Heating',
      badge: badgeColors[heating.icon],
      spanClass: 'col-span-1',
    },
    {
      id: handyman.id,
      type: 'standard' as const,
      category: handyman,
      slug: handyman.slug,
      name: handyman.name,
      icon: handyman.icon,
      stripeType: 'A' as const,
      caption: 'Handyman',
      badge: badgeColors[handyman.icon],
      spanClass: 'col-span-1',
    },
    {
      id: painting.id,
      type: 'standard' as const,
      category: painting,
      slug: painting.slug,
      name: painting.name,
      icon: painting.icon,
      stripeType: 'A' as const,
      caption: 'Painting',
      badge: badgeColors[painting.icon],
      spanClass: 'col-span-1',
    },
    {
      id: 'all-services',
      type: 'all-services' as const,
      slug: '',
      name: 'All Services',
      icon: 'grid',
      stripeType: 'A' as const,
      caption: 'Browse All',
      badge: { bg: '#1F3A4D', label: 'Browse' },
      spanClass: 'col-span-1',
    },
    {
      id: gardening.id,
      type: 'wide' as const,
      category: gardening,
      slug: gardening.slug,
      name: gardening.name,
      icon: gardening.icon,
      stripeType: 'B' as const,
      caption: 'Gardening',
      badge: badgeColors[gardening.icon],
      spanClass: 'col-span-2',
    },
  ];

  const usedIds = new Set([cleaning.id, plumbing.id, electrical.id, heating.id, handyman.id, painting.id, gardening.id]);
  const extraCategories = categories.filter(c => !usedIds.has(c.id)).map(c => ({
      id: c.id,
      type: 'standard' as const,
      category: c,
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      stripeType: 'A' as const,
      caption: c.name.split(' ')[0],
      badge: badgeColors[c.icon] || { bg: c.color ?? '#1F3A4D', label: 'Service' },
      spanClass: 'col-span-1',
  }));

  tiles.push(...extraCategories);


  return (
    <section className="lg:hidden bg-bg px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[16px] font-extrabold text-ink">Explore our services</h3>
        <Link href="/services" className="text-[12px] font-semibold text-accent hover:text-accent-hover flex items-center gap-0.5">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {tiles.map((tile) => {
          const Icon = tile.icon === 'grid' ? Grid3X3 : getCategoryIcon(tile.icon);
          const href = tile.type === 'all-services' ? '/services' : `/services/${tile.slug}`;

          if (tile.type === 'feature' || tile.type === 'wide') {
            return (
              <Link
                key={tile.id}
                href={href}
                className={`group card-shadow card overflow-hidden rounded-xl transition hover:border-accent flex flex-row h-24 ${tile.spanClass}`}
                style={{ borderColor: '#ECE6D9' }}
              >
                <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {tile.badge && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em] text-white"
                          style={{ background: tile.badge.bg }}
                        >
                          {tile.badge.label}
                        </span>
                      )}
                    </div>
                    <h4 className="text-[13px] font-bold leading-tight text-ink group-hover:text-accent transition-colors truncate">
                      {tile.name}
                    </h4>
                  </div>
                  {tile.category && (
                    <span className="text-[11px] font-medium text-success block">
                      From {pence(tile.category.minPricePence)}
                    </span>
                  )}
                </div>
                <div className="relative w-1/3 flex items-center justify-center overflow-hidden border-l border-hairline shrink-0" style={getStripeStyle(tile.stripeType)}>
                  <span className="font-mono text-[9px] text-[#8A8574] select-none text-center px-1">
                    {tile.caption}
                  </span>
                  <span className="absolute bottom-2 right-2 h-6 w-6 grid place-items-center rounded bg-white shadow-sm border border-input-border">
                    <Icon className="h-3.5 w-3.5 text-ink" />
                  </span>
                </div>
              </Link>
            );
          }

          if (tile.type === 'all-services') {
            return (
              <Link
                key={tile.id}
                href={href}
                className={`group card-shadow card overflow-hidden rounded-xl transition hover:border-accent flex flex-col justify-between h-28 ${tile.spanClass}`}
                style={{ borderColor: '#ECE6D9' }}
              >
                <div className="relative h-14 flex items-center justify-center overflow-hidden" style={getStripeStyle(tile.stripeType)}>
                  <span className="font-mono text-[9px] text-[#8A8574] select-none text-center px-1">
                    {tile.caption}
                  </span>
                  <span
                    className="absolute top-2 left-2 rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em] text-white"
                    style={{ background: tile.badge.bg }}
                  >
                    {tile.badge.label}
                  </span>
                </div>
                <div className="p-2 pt-1 flex flex-col justify-between flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-[11px] font-bold leading-tight text-ink group-hover:text-accent transition-colors truncate">
                      {tile.name}
                    </h4>
                    <span className="flex-shrink-0 grid h-6 w-6 place-items-center rounded bg-ink/5">
                      <Grid3X3 className="h-3 w-3 text-ink" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={tile.id}
              href={href}
              className={`group card-shadow card overflow-hidden rounded-xl transition hover:border-accent flex flex-col justify-between h-28 ${tile.spanClass}`}
              style={{ borderColor: '#ECE6D9' }}
            >
              <div className="relative h-14 flex items-center justify-center overflow-hidden" style={getStripeStyle(tile.stripeType)}>
                <span className="font-mono text-[9px] text-[#8A8574] select-none text-center px-1">
                  {tile.caption}
                </span>
                {tile.badge && (
                  <span
                    className="absolute top-2 left-2 rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em] text-white"
                    style={{ background: tile.badge.bg }}
                  >
                    {tile.badge.label}
                  </span>
                )}
              </div>
              <div className="p-2 pt-1 flex flex-col justify-between flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-[11px] font-bold leading-tight text-ink group-hover:text-accent transition-colors truncate">
                    {tile.name}
                  </h4>
                  <span className="flex-shrink-0 grid h-6 w-6 place-items-center rounded bg-ink/5">
                    <Icon className="h-3 w-3 text-ink" />
                  </span>
                </div>
                {tile.category && (
                  <span className="text-[10px] font-medium text-success block">
                    From {pence(tile.category.minPricePence)}
                  </span>
                )}
              </div>
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
          <Link key={item.id} href="/services" className="w-36 shrink-0 snap-start">
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
            <a href="/services" className="flex items-center gap-0.5 text-[12px] font-semibold text-accent">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <Link key={item.id} href="/services" className="flex items-center gap-3">
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
          <Logo inverted />
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
