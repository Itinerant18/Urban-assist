'use client';

import * as React from 'react';
import { SERVICE_CATEGORIES, categoryIcons } from '../../lib/services-data';
import { Card } from '@urban-assist/ui';
import { Search } from 'lucide-react';
import Link from 'next/link';

export function CatalogClient() {
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<string>(SERVICE_CATEGORIES[0]?.id ?? '');
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Fuzzy search filtering
  const query = search.trim().toLowerCase();

  const filteredCategories = React.useMemo(() => {
    return SERVICE_CATEGORIES.map((cat) => {
      // Filter subcategories matching search query
      const matchingSubs = cat.subcategories.filter((sub) => {
        const matchesSubName = sub.name.toLowerCase().includes(query);
        const matchesSubDesc = sub.description.toLowerCase().includes(query);
        const matchesServices = sub.services.some(
          (s) => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
        );
        return matchesSubName || matchesSubDesc || matchesServices;
      });

      return {
        ...cat,
        subcategories: matchingSubs,
      };
    }).filter((cat) => cat.subcategories.length > 0 || cat.name.toLowerCase().includes(query));
  }, [query]);

  // Scroll spy implementation using IntersectionObserver
  React.useEffect(() => {
    const elements = Object.values(sectionRefs.current).filter(Boolean) as HTMLDivElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px', // Trigger when section is in upper-middle viewport
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [filteredCategories]);

  // Smooth scroll helper
  const scrollToSection = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // account for headers
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search services input header */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted" />
        <input
          type="text"
          className="tap w-full rounded-2xl border border-hairline bg-white py-3 pl-12 pr-4 text-base shadow-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
          placeholder="Search services or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        
        {/* LEFT SIDEBAR (Desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 space-y-4">
            <h3 className="text-xs font-bold text-muted font-mono-utility tracking-wider uppercase">Categories</h3>
            <ul className="space-y-1">
              {SERVICE_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                const IconComponent = categoryIcons[cat.icon];
                return (
                  <li key={cat.id}>
                    <button
                      onClick={() => scrollToSection(cat.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-all ${
                        isActive
                          ? 'bg-accent/10 font-bold text-accent shadow-sm'
                          : 'text-muted hover:text-ink hover:bg-bg/40 font-medium'
                      }`}
                    >
                      {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{cat.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* STICKY HORIZONTAL PILL MENU (Mobile) */}
        <div className="lg:hidden sticky top-[56px] z-20 bg-bg/95 backdrop-blur-md border-b border-hairline py-3 -mx-4 px-4 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
          {SERVICE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const IconComponent = categoryIcons[cat.icon];
            return (
              <button
                key={cat.id}
                onClick={() => scrollToSection(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border transition-all ${
                  isActive
                    ? 'bg-accent border-accent text-white'
                    : 'bg-white border-hairline text-muted hover:text-ink'
                }`}
              >
                {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT CSS-GRID ITEMS DISPLAY */}
        <div className="space-y-12">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-20 bg-white border border-hairline rounded-3xl p-6">
              <p className="text-muted text-sm">No services or categories matched &ldquo;{search}&rdquo;.</p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const CatIcon = categoryIcons[cat.icon];
              return (
                <div
                  key={cat.id}
                  id={cat.id}
                  ref={(el) => {
                    sectionRefs.current[cat.id] = el;
                  }}
                  className="space-y-4 scroll-mt-28"
                >
                  <div className="flex items-center gap-2 border-b border-hairline pb-2">
                    {CatIcon && <CatIcon className="h-5 w-5 text-accent" />}
                    <h2 className="font-display text-lg font-bold text-ink uppercase tracking-wide">
                      {cat.name}
                    </h2>
                  </div>

                  {/* Dense Masonry CSS-Grid (2 cols on mobile, 3-4 on desktop) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cat.subcategories.map((sub) => {
                      const SubIcon = categoryIcons[sub.icon] ?? CatIcon;
                      return (
                        <Link key={sub.id} href={`/services/${cat.slug}/${sub.slug}`}>
                          <Card className="aspect-square flex flex-col items-center justify-center p-4 gap-3 bg-white border border-hairline hover:border-accent/40 hover:bg-accent/5 hover:-translate-y-1 transition-all cursor-pointer group shadow-sm text-center">
                            <div className="rounded-2xl bg-bg p-3 group-hover:bg-accent/10 transition-colors">
                              {SubIcon && (
                                <SubIcon className="h-6 w-6 text-charcoal group-hover:text-accent transition-colors" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-ink text-xs line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                                {sub.name}
                              </h4>
                              <p className="text-[10px] text-muted line-clamp-1 mt-1">
                                {sub.services.length} services
                              </p>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
