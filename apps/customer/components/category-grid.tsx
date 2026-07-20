import { Grid3X3, ArrowRight } from 'lucide-react';
import type { HomepageCategory } from '../lib/homepage-data';
import { getCategoryIcon } from '../lib/homepage-data';
import { pence } from '@urban-assist/lib';

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

export function CategoryGrid({ categories }: CategoryGridProps) {
  // Find specific categories to arrange them in a Bento Grid structure
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
      description: cleaning.description || 'Professional home and flat cleaning services.',
      icon: cleaning.icon,
      stripeType: 'B' as const,
      caption: 'Cleaning service — photo',
      spanClass: 'col-span-2 row-span-1 sm:row-span-2',
      badge: badgeColors[cleaning.icon] || { bg: '#6B8F6B', label: 'Top rated' },
    },
    {
      id: plumbing.id,
      type: 'standard' as const,
      category: plumbing,
      slug: plumbing.slug,
      name: plumbing.name,
      description: plumbing.description,
      icon: plumbing.icon,
      stripeType: 'A' as const,
      caption: 'Plumbing service — photo',
      spanClass: 'col-span-1 row-span-1',
      badge: badgeColors[plumbing.icon],
    },
    {
      id: electrical.id,
      type: 'standard' as const,
      category: electrical,
      slug: electrical.slug,
      name: electrical.name,
      description: electrical.description,
      icon: electrical.icon,
      stripeType: 'A' as const,
      caption: 'Electrical service — photo',
      spanClass: 'col-span-1 row-span-1',
      badge: badgeColors[electrical.icon],
    },
    {
      id: heating.id,
      type: 'standard' as const,
      category: heating,
      slug: heating.slug,
      name: heating.name,
      description: heating.description,
      icon: heating.icon,
      stripeType: 'A' as const,
      caption: 'Heating & boiler — photo',
      spanClass: 'col-span-1 row-span-1',
      badge: badgeColors[heating.icon],
    },
    {
      id: handyman.id,
      type: 'standard' as const,
      category: handyman,
      slug: handyman.slug,
      name: handyman.name,
      description: handyman.description,
      icon: handyman.icon,
      stripeType: 'A' as const,
      caption: 'Handyman service — photo',
      spanClass: 'col-span-1 row-span-1',
      badge: badgeColors[handyman.icon],
    },
    {
      id: painting.id,
      type: 'standard' as const,
      category: painting,
      slug: painting.slug,
      name: painting.name,
      description: painting.description,
      icon: painting.icon,
      stripeType: 'A' as const,
      caption: 'Painting & decor — photo',
      spanClass: 'col-span-1 row-span-1',
      badge: badgeColors[painting.icon],
    },
    {
      id: 'all-services',
      type: 'all-services' as const,
      slug: '',
      name: 'All Services',
      description: 'Browse our complete catalog of professional services.',
      icon: 'grid',
      stripeType: 'A' as const,
      caption: 'Browse catalog — illustration',
      spanClass: 'col-span-1 row-span-1',
      badge: { bg: '#1F3A4D', label: 'Browse' },
    },
    {
      id: gardening.id,
      type: 'wide' as const,
      category: gardening,
      slug: gardening.slug,
      name: gardening.name,
      description: gardening.description || 'Professional gardening and outdoor maintenance.',
      icon: gardening.icon,
      stripeType: 'B' as const,
      caption: 'Gardening & outdoor — photo',
      spanClass: 'col-span-2 row-span-1',
      badge: badgeColors[gardening.icon],
    },
  ];

  const usedIds = new Set([cleaning.id, plumbing.id, electrical.id, heating.id, handyman.id, painting.id, gardening.id]);
  const extraCategories = categories.filter(c => !usedIds.has(c.id)).map(c => ({
      id: c.id,
      type: 'standard' as const,
      category: c,
      slug: c.slug,
      name: c.name,
      description: c.description || '',
      icon: c.icon,
      stripeType: 'A' as const,
      caption: c.name,
      spanClass: 'col-span-1 row-span-1',
      badge: badgeColors[c.icon],
  }));

  tiles.push(...extraCategories);


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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const Icon = getCategoryIcon(tile.icon);

            if (tile.type === 'feature') {
              return (
                <a
                  key={tile.id}
                  href={`/services/${tile.slug}`}
                  className={`group card-shadow card overflow-hidden rounded-xl transition hover:border-accent flex flex-col h-full justify-between ${tile.spanClass}`}
                  style={{ borderColor: '#ECE6D9' }}
                >
                  <div className="relative h-36 sm:h-52 flex items-center justify-center overflow-hidden" style={getStripeStyle(tile.stripeType)}>
                    <span className="font-mono text-[11px] text-[#8A8574] select-none text-center px-4">
                      {tile.caption}
                    </span>
                    {tile.badge && (
                      <span
                        className="absolute top-4 left-4 rounded px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white"
                        style={{ background: tile.badge.bg }}
                      >
                        {tile.badge.label}
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[18px] font-extrabold leading-tight text-ink group-hover:text-accent transition-colors">
                          {tile.name}
                        </h3>
                        <span className="flex-shrink-0 grid h-9 w-9 place-items-center rounded-lg bg-ink/5 group-hover:bg-accent/10 transition-colors">
                          <Icon className="h-5 w-5 text-ink group-hover:text-accent transition-colors" />
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted line-clamp-2 sm:line-clamp-none">
                        {tile.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
                      {tile.category && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted block">Starting at</span>
                          <span className="text-[16px] font-extrabold text-ink">
                            {pence(tile.category.minPricePence)}
                          </span>
                        </div>
                      )}
                      <span className="rounded-lg border border-accent text-accent px-4 py-1.5 text-xs font-bold transition group-hover:bg-accent group-hover:text-white">
                        Book now
                      </span>
                    </div>
                  </div>
                </a>
              );
            }

            if (tile.type === 'wide') {
              return (
                <a
                  key={tile.id}
                  href={`/services/${tile.slug}`}
                  className={`group card-shadow card overflow-hidden rounded-xl transition hover:border-accent flex flex-col sm:flex-row ${tile.spanClass}`}
                  style={{ borderColor: '#ECE6D9' }}
                >
                  <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {tile.badge && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.04em] text-white"
                            style={{ background: tile.badge.bg }}
                          >
                            {tile.badge.label}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-success">Popular Choice</span>
                      </div>
                      <h3 className="text-[16px] font-bold leading-tight text-ink group-hover:text-accent transition-colors flex items-center justify-between gap-2">
                        {tile.name}
                        <span className="sm:hidden flex-shrink-0 grid h-7 w-7 place-items-center rounded-lg bg-ink/5">
                          <Icon className="h-4 w-4 text-ink" />
                        </span>
                      </h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted line-clamp-2">
                        {tile.description}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {tile.category && (
                        <span className="text-[14px] font-extrabold text-ink">
                          From {pence(tile.category.minPricePence)}
                        </span>
                      )}
                      <span className="text-xs font-bold text-accent group-hover:text-accent-hover flex items-center gap-1">
                        View details <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                  <div className="relative h-28 sm:h-auto sm:w-2/5 flex items-center justify-center overflow-hidden border-t sm:border-t-0 sm:border-l border-hairline shrink-0" style={getStripeStyle(tile.stripeType)}>
                    <span className="font-mono text-[10px] text-[#8A8574] select-none text-center px-4">
                      {tile.caption}
                    </span>
                    <span className="hidden sm:grid absolute bottom-4 right-4 h-8 w-8 place-items-center rounded-lg bg-white shadow-sm border border-input-border group-hover:border-accent transition">
                      <Icon className="h-4 w-4 text-ink group-hover:text-accent" />
                    </span>
                  </div>
                </a>
              );
            }

            if (tile.type === 'all-services') {
              return (
                <a
                  key={tile.id}
                  href="/services"
                  className={`group card-shadow card overflow-hidden rounded-xl transition hover:border-accent flex flex-col justify-between ${tile.spanClass}`}
                  style={{ borderColor: '#ECE6D9' }}
                >
                  <div className="relative h-28 sm:h-32 flex items-center justify-center overflow-hidden" style={getStripeStyle(tile.stripeType)}>
                    <span className="font-mono text-[10px] text-[#8A8574] select-none text-center px-2">
                      {tile.caption}
                    </span>
                    <span
                      className="absolute top-3 left-3 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white"
                      style={{ background: tile.badge.bg }}
                    >
                      {tile.badge.label}
                    </span>
                  </div>
                  <div className="p-3 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[14px] font-bold leading-tight text-ink group-hover:text-accent transition-colors">
                        {tile.name}
                      </h3>
                      <span className="flex-shrink-0 grid h-7 w-7 place-items-center rounded-lg bg-ink/5 group-hover:bg-accent/10 transition-colors">
                        <Grid3X3 className="h-4 w-4 text-ink group-hover:text-accent transition-colors" />
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-muted">
                      Browse all categories
                    </p>
                  </div>
                </a>
              );
            }

            return (
              <a
                key={tile.id}
                href={`/services/${tile.slug}`}
                className={`group card-shadow card overflow-hidden rounded-xl transition hover:border-accent flex flex-col justify-between ${tile.spanClass}`}
                style={{ borderColor: '#ECE6D9' }}
              >
                <div className="relative h-28 sm:h-32 flex items-center justify-center overflow-hidden" style={getStripeStyle(tile.stripeType)}>
                  <span className="font-mono text-[10px] text-[#8A8574] select-none text-center px-2">
                    {tile.caption}
                  </span>
                  {tile.badge && (
                    <span
                      className="absolute top-3 left-3 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white"
                      style={{ background: tile.badge.bg }}
                    >
                      {tile.badge.label}
                    </span>
                  )}
                </div>
                <div className="p-3 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[14px] font-bold leading-tight text-ink group-hover:text-accent transition-colors">
                      {tile.name}
                    </h3>
                    <span className="flex-shrink-0 grid h-7 w-7 place-items-center rounded-lg bg-ink/5 group-hover:bg-accent/10 transition-colors">
                      <Icon className="h-4 w-4 text-ink group-hover:text-accent transition-colors" />
                    </span>
                  </div>
                  {tile.category && (
                    <p className="mt-1 text-[11px] font-medium text-success">
                      From {pence(tile.category.minPricePence)}
                    </p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
