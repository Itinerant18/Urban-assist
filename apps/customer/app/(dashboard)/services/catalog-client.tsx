'use client';

import * as React from 'react';
import { SERVICE_CATEGORIES, categoryIcons, type Category } from '@/lib/services-data';
import { ServiceImage } from '@urban-assist/ui';
import { SubcategoryIcon } from '@/components/subcategory-icon';
import { Search } from 'lucide-react';
import Link from 'next/link';

interface CatalogClientProps {
  categories?: Category[];
}

export function CatalogClient({ categories = SERVICE_CATEGORIES }: CatalogClientProps) {
  const serviceCategories = categories.length > 0 ? categories : SERVICE_CATEGORIES;
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<string>(serviceCategories[0]?.id ?? '');
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Fuzzy search filtering
  const query = search.trim().toLowerCase();

  const filteredCategories = React.useMemo(() => {
    return serviceCategories.map((cat) => {
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
  }, [query, serviceCategories]);

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
              {filteredCategories.map((cat) => {
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
          {filteredCategories.map((cat) => {
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
              return (
                <div
                  key={cat.id}
                  id={cat.id}
                  ref={(el) => {
                    sectionRefs.current[cat.id] = el;
                  }}
                  className="space-y-4 scroll-mt-28"
                >
                  <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                    {cat.name}
                  </h2>

                  {/* UC-style "select a service" sheet: one white card per
                      category, plain image tiles with the label below. */}
                  <div className="rounded-2xl border border-hairline bg-white p-4">
                    <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4 xl:grid-cols-6">
                      {cat.subcategories.map((sub) => {
                        return (
                          <Link
                            key={sub.id}
                            href={`/services/${cat.slug}/${sub.slug}`}
                            className="tap group flex min-w-0 flex-col items-center gap-1.5 text-center transition active:scale-[0.98]"
                          >
                            <span className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-bg transition-colors group-hover:bg-accent/10">
                              <SubcategoryIcon
                                subSlug={sub.slug}
                                imgClassName="absolute inset-0 h-full w-full object-contain p-1.5"
                                fallbackNode={<ServiceImage slug={cat.slug} caption="" />}
                              />
                            </span>
                            <span className="line-clamp-2 text-[11px] font-bold leading-[1.25] text-charcoal transition-colors group-hover:text-accent-deep">
                              {sub.name}
                            </span>
                            <span className="text-[10px] font-medium text-muted">
                              {sub.services.length} service{sub.services.length !== 1 ? 's' : ''}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
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
