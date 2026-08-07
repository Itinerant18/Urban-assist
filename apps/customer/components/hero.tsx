import type { HomepageData } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';
import { Reveal } from '@urban-assist/ui';
import { PostcodeGate } from './postcode-gate';
import { BadgePercent, ShieldCheck, BadgePoundSterling, CalendarCheck, Star } from 'lucide-react';

interface HeroProps {
  promoCode: HomepageData['promoCode'];
}

export function Hero({ promoCode }: HeroProps) {
  return (
    <section className="bg-bg pt-14 pb-16">
      <div className="mx-auto max-w-page px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[7fr,5fr] lg:gap-16">
          <Reveal>
            <div>
              <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
                London &amp; the South East — vetted pros
              </p>
              <h1 className="mt-4 text-[44px] font-extrabold leading-[1.04] tracking-[-0.03em] text-ink lg:text-[58px]">
                Home services,
                <br />
                <span className="relative inline-block">
                  sorted.
                  <svg
                    viewBox="0 0 120 8"
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-2 w-full"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 6 Q 24 2.5, 47 5 T 92 4.5 T 118 5"
                      stroke="rgb(var(--amber))"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
                Book trusted professionals for cleaning, repairs, installation, and more.
                Verified providers, transparent pricing, hassle-free.
              </p>

              <PostcodeGate
                variant="hero"
                placeholder="e.g. EC1A 1BB"
                className="mt-8 max-w-md"
              />
              <p className="mt-2 text-[12px] text-muted">
                Enter your postcode to see services and pricing in your area.
              </p>

              {promoCode && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3.5 py-1.5">
                  <BadgePercent className="h-4 w-4 text-amber-deep" aria-hidden="true" />
                  <span className="text-[12px] font-semibold text-amber-deep">
                    Use code {promoCode.code} - save on your first booking
                  </span>
                </p>
              )}

              <div className="mt-9 flex divide-x divide-hairline text-[12px] font-semibold text-charcoal">
                <span className="flex items-center gap-1.5 px-4 first:pl-0">
                  <ShieldCheck className="h-4 w-4 text-success-deep" aria-hidden="true" />
                  Vetted pros
                </span>
                <span className="flex items-center gap-1.5 px-4 first:pl-0">
                  <BadgePoundSterling className="h-4 w-4 text-success-deep" aria-hidden="true" />
                  Fixed prices
                </span>
                <span className="flex items-center gap-1.5 px-4 first:pl-0">
                  <CalendarCheck className="h-4 w-4 text-success-deep" aria-hidden="true" />
                  Reschedule free
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal index={2}>
            <div className="relative hidden h-[460px] lg:block" aria-hidden="true">
              <div className="absolute right-8 top-0 w-[340px] rotate-[-1.5deg] rounded-2xl border border-hairline bg-white p-2 shadow-card">
                <div className="aspect-[4/5] overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/services/home-cleaning-big.webp"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-2 left-0 w-[220px] rotate-[2deg] rounded-2xl border border-hairline bg-white p-2 shadow-card animate-float">
                <div className="aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/services/plumbing-solution.webp"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-24 right-0 animate-float-late rounded-xl bg-ink px-4 py-2.5 shadow-card">
                <p className="text-[10px] uppercase tracking-wider text-footer-muted">From</p>
                <p className="flex items-center gap-1.5 font-mono-utility text-[18px] font-extrabold text-white">
                  {pence(1500)}
                  <Star className="h-4 w-4 fill-amber text-amber" aria-hidden="true" />
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
