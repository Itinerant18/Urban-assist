import { Grid3X3, ArrowRight } from 'lucide-react';
import type { HomepageCategory } from '../lib/homepage-data';

interface CategoryGridProps {
  categories: HomepageCategory[];
}

const badgeColors: Record<string, { bg: string; label: string }> = {
  sparkles: { bg: '#6B8F6B', label: 'Top rated' },
  wrench: { bg: '#C1622E', label: 'Popular' },
  zap: { bg: '#D9A441', label: 'Popular' },
  settings: { bg: '#C1622E', label: 'Trending' },
  leaf: { bg: '#6B8F6B', label: 'Trending' },
  hammer: { bg: '#1F3A4D', label: 'Popular' },
  paintbrush: { bg: '#1F3A4D', label: 'Popular' },
  lock: { bg: '#1F3A4D', label: 'New' },
};

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="bg-bg py-12">
      <div className="mx-auto max-w-page px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[26px] font-extrabold text-ink">Explore our services</h2>
          <a
            href="/services"
            className="flex items-center gap-1 text-[14px] font-semibold text-accent hover:text-accent-hover"
          >
            View all <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.slice(0, 7).map((cat) => {
            const badge = badgeColors[cat.icon];
            return (
              <a
                key={cat.id}
                href={`/services?category=${cat.slug}`}
                className="group card-shadow card overflow-hidden rounded-xl transition hover:border-accent"
                style={{ borderColor: '#ECE6D9' }}
              >
                <div className="h-36 bg-hairline/30" />
                <div className="relative px-3 pb-3 pt-2">
                  {badge && (
                    <span
                      className="absolute -top-3 left-3 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white"
                      style={{ background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  )}
                  <h3 className="mt-2 text-[14px] font-bold leading-tight text-ink">
                    {cat.name}
                  </h3>
                </div>
              </a>
            );
          })}
          {/* All Services tile */}
          <a
            href="/services"
            className="group card-shadow card overflow-hidden rounded-xl transition hover:border-accent"
            style={{ borderColor: '#ECE6D9' }}
          >
            <div className="h-36 bg-hairline/30" />
            <div className="relative px-3 pb-3 pt-2">
              <span
                className="absolute -top-3 left-3 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white"
                style={{ background: '#1F3A4D' }}
              >
                Browse
              </span>
              <span className="mt-2 grid h-8 w-8 place-items-center rounded-lg bg-ink/5">
                <Grid3X3 className="h-4 w-4 text-ink" />
              </span>
              <h3 className="mt-1 text-[14px] font-bold leading-tight text-ink">All Services</h3>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
