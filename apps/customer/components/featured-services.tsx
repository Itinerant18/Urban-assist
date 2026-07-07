import { getCategoryIcon } from '../lib/homepage-data';
import type { HomepageService } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';

interface FeaturedServicesProps {
  trending: HomepageService[];
}

export function FeaturedServices({ trending }: FeaturedServicesProps) {
  const displayed = trending.slice(0, 4);

  return (
    <section className="bg-bg py-12">
      <div className="mx-auto max-w-page px-6">
        <div className="rounded-2xl p-6" style={{ background: '#E8F0E8', border: '1px solid #E2DACB' }}>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[20px] font-extrabold text-ink">Trending Services</h3>
            <a href="/services" className="text-[13px] font-semibold text-accent">
              View all
            </a>
          </div>
          {displayed.length === 0 ? (
            <p className="text-[13px] text-muted">No services available yet.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {displayed.map((s) => {
                const Icon = getCategoryIcon(s.icon);
                return (
                  <li key={s.id} className="flex items-center gap-4 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10">
                      <Icon className="h-5 w-5 text-accent" />
                    </span>
                    <div className="flex-1">
                      <span className="text-[14px] font-bold text-ink">{s.title}</span>
                      <p className="text-[11px] text-muted">{s.categoryName}</p>
                    </div>
                    <span className="text-[14px] font-extrabold text-ink">
                      {pence(s.pricePence)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
