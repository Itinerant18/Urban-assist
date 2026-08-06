'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomepageData } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';
import { cn } from '@urban-assist/ui';

interface PromoCarouselProps {
  promoCode: HomepageData['promoCode'];
}

// Real carousel, zero deps: CSS scroll-snap + JS that only observes
// (chevrons/dots). Scroll listeners attach after the section is visible.
const TINTS = ['#E4D4C4', '#DFEADF', '#F3E2DD'];

export function PromoCarousel({ promoCode }: PromoCarouselProps) {
  const discountLabel = promoCode
    ? promoCode.discountType === 'percent'
      ? `Save ${promoCode.discountValue}%`
      : `Save ${pence(promoCode.discountValue)}`
    : 'Save 20%';
  const code = promoCode?.code ?? 'URBAN20';

  const slides = React.useMemo(
    () => [
      {
        badge: 'Limited offer',
        headline: `${discountLabel} on your first booking`,
        body: (
          <>
            Use code <strong className="text-accent">{code}</strong> at checkout. Valid for
            new customers only. Terms apply.
          </>
        ),
        cta: { label: 'Book now', href: '/services' },
      },
      {
        badge: 'Handpicked pros',
        headline: 'Vetted, rated, reviewed',
        body: 'Every professional is ID & DBS checked and rated by real customers after each job.',
        cta: { label: 'Find a pro', href: '/browse' },
      },
      {
        badge: 'Refer a friend',
        headline: 'Both of you get rewarded',
        body: 'Share Urban Assist with a neighbour and earn credit towards your next booking.',
        cta: { label: 'Refer now', href: '/referrals' },
      },
    ],
    [discountLabel, code]
  );

  const trackRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el || !visible) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActive((prev) => (prev === i ? prev : i));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [visible]);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, slides.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setActive(clamped);
  };

  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-page px-6">
        <div
          ref={trackRef}
          role="region"
          aria-roledescription="carousel"
          aria-label="Offers"
          className="relative flex snap-x snap-mandatory overflow-x-auto rounded-2xl scrollbar-none"
        >
          {slides.map((slide, i) => (
            <article
              key={slide.headline}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              className="flex w-full shrink-0 snap-start items-center justify-between px-14 py-8"
              style={{ background: TINTS[i % TINTS.length] }}
            >
              <div className="max-w-md">
                <span className="inline-block rounded-full bg-white/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] text-ink">
                  {slide.badge}
                </span>
                <h3 className="mt-3 text-[22px] font-extrabold text-ink">{slide.headline}</h3>
                <p className="mt-2 text-[13px] text-muted">{slide.body}</p>
                <a
                  href={slide.cta.href}
                  className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-accent-hover"
                >
                  {slide.cta.label}
                </a>
              </div>
            </article>
          ))}

          <button
            onClick={() => goTo(active - 1)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/60 text-ink backdrop-blur transition hover:bg-white/90"
            aria-label="Previous offer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo(active + 1)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/60 text-ink backdrop-blur transition hover:bg-white/90"
            aria-label="Next offer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.headline}
                onClick={() => goTo(i)}
                aria-label={`Go to offer ${i + 1}`}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === active ? 'w-5 bg-accent' : 'w-2 bg-ink/20 hover:bg-ink/40'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
