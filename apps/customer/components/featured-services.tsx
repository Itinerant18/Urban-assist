import { getCategoryIcon } from '../lib/homepage-data';
import type { HomepageService } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@urban-assist/ui';

interface FeaturedServicesProps {
  trending: HomepageService[];
}

export function FeaturedServices({ trending }: FeaturedServicesProps) {
  const displayed = trending.slice(0, 4);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-page px-6">
        <div className="rounded-2xl border border-input-border bg-amber/[0.07] p-6 sm:p-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
                Most booked this month
              </p>
              <h3 className="mt-2 text-[22px] font-extrabold tracking-tight text-ink">
                Trending Services
              </h3>
            </div>
            <a
              href="/services"
              className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent-deep transition hover:text-accent"
            >
              View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          {displayed.length === 0 ? (
            <p className="text-[13px] text-muted">No services available yet.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {displayed.map((s, i) => {
                const Icon = getCategoryIcon(s.icon);
                return (
                  <Reveal key={s.id} index={i}>
                    <li className="flex items-center gap-4 rounded-lg py-3.5 transition hover:bg-white/60 -mx-2 px-2">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10">
                        <Icon className="h-5 w-5 text-accent-deep" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-ink">
                          {s.title}
                        </span>
                        <p className="text-[11px] text-muted">{s.categoryName}</p>
                      </div>
                      <span className="font-mono-utility text-[14px] font-extrabold text-ink">
                        {pence(s.pricePence)}
                      </span>
                    </li>
                  </Reveal>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
