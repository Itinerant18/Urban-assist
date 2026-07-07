import { MapPin } from 'lucide-react';
import type { HomepageCategory, HomepageData } from '../lib/homepage-data';
import { getCategoryIcon } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';

interface HeroProps {
  categories: HomepageCategory[];
  promoCode: HomepageData['promoCode'];
}

const tileColors: Record<string, string> = {
  sparkles: '#6B8F6B',
  wrench: '#C1622E',
  zap: '#D9A441',
  leaf: '#6B8F6B',
  settings: '#C1622E',
  hammer: '#1F3A4D',
  paintbrush: '#1F3A4D',
  lock: '#1F3A4D',
};

export function Hero({ categories, promoCode }: HeroProps) {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-page px-6">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-16">
          <div className="flex-1">
            <h1 className="text-[44px] font-extrabold leading-[1.12] tracking-[-0.02em] text-ink">
              Home services<br />at your doorstep
            </h1>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted">
              Book trusted professionals for cleaning, repairs, installation, and more.
              Verified providers, transparent pricing, hassle-free.
            </p>

            {promoCode && (
              <p className="mt-3 text-[13px] font-semibold text-accent">
                Use code <span className="font-extrabold">{promoCode.code}</span> to save
              </p>
            )}

            <div className="mt-8">
              <h2 className="mb-4 text-[15px] font-bold text-ink">What are you looking for?</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {categories.slice(0, 8).map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  const color = tileColors[cat.icon] ?? '#C1622E';
                  return (
                    <a
                      key={cat.id}
                      href={`/services?category=${cat.slug}`}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-input-border bg-white p-4 text-center transition hover:border-accent"
                    >
                      <span
                        className="grid h-10 w-10 place-items-center rounded-lg"
                        style={{ background: `${color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color }} />
                      </span>
                      <span className="text-[12px] font-semibold leading-tight text-ink">
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-medium text-success">
                        From {pence(cat.minPricePence)}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="hidden w-full max-w-md lg:block">
            <div className="flex h-[420px] w-full items-center justify-center rounded-[18px] bg-hairline/40" />
          </div>
        </div>
      </div>
    </section>
  );
}
