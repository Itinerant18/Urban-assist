import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PromoCarousel() {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-page px-6">
        <div
          className="relative flex items-center justify-between overflow-hidden rounded-2xl px-10 py-8"
          style={{ background: '#E4D4C4' }}
        >
          {/* Left arrow */}
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-ink backdrop-blur transition hover:bg-white/90"
            aria-label="Previous offer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="max-w-md">
            <span className="inline-block rounded-full bg-white/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-ink">
              Limited offer
            </span>
            <h3 className="mt-3 text-[22px] font-extrabold text-ink">
              Save 20% on your first booking
            </h3>
            <p className="mt-2 text-[13px] text-muted">
              Use code <strong className="text-accent">URBAN20</strong> at checkout.
              Valid for new customers only. Terms apply.
            </p>
            <a
              href="/services"
              className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-accent-hover"
            >
              Book now
            </a>
          </div>

          {/* Right arrow */}
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-ink backdrop-blur transition hover:bg-white/90"
            aria-label="Next offer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Carousel dots */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-hairline" />
            <span className="h-2 w-2 rounded-full bg-hairline" />
          </div>
        </div>
      </div>
    </section>
  );
}
