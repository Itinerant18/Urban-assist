"use client";

import { useState, useEffect, useRef } from 'react';
import { getCategoryIcon, type Category } from '../../lib/services-data';
import { cn } from '../../lib/utils';

// Sticky category navigation: plain flat tabs at rest, notch pill when scrolled.
export function CategoryTabs({ categories }: { categories: Category[] }) {
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const navRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Sentinel out of view = nav is stuck to viewport top
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find the entry that is currently intersecting the most
      let highestRatio = 0;
      let currentActive = '';

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
          highestRatio = entry.intersectionRatio;
          currentActive = entry.target.id;
        }
      });

      if (currentActive) {
        setActiveSlug(currentActive);
      }
    };

    const observerOptions = {
      root: null,
      // Target elements when they occupy the upper half of the viewport
      rootMargin: '-130px 0px -50% 0px',
      threshold: [0.1, 0.2, 0.5],
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    categories.forEach((c) => {
      const el = document.getElementById(c.slug);
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [categories]);

  const renderTabs = () =>
    categories.map((c) => {
      const Icon = getCategoryIcon(c.icon);
      const isActive = activeSlug === c.slug;

      return (
        <a
          key={c.id}
          href={`#${c.slug}`}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all shadow-sm duration-200",
            isActive
              ? "border-accent bg-accent text-white font-extrabold hover:bg-accent-hover"
              : "border-hairline bg-bg/50 text-ink/70 hover:border-accent hover:text-accent hover:bg-white"
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="whitespace-nowrap">{c.name}</span>
        </a>
      );
    });

  return (
    <>
      <div ref={sentinelRef} style={{ height: 0, visibility: 'hidden' }} />
      <nav
        ref={navRef}
        className={cn(
          "sticky top-[56px] z-30 -mx-4 lg:top-[64px] lg:-mx-6 transition-all duration-200",
          isSticky
            ? "bg-bg/95 backdrop-blur-md shadow-sm border-b border-hairline"
            : "bg-transparent"
        )}
      >
        <div className="px-4 lg:px-6 py-2.5 flex gap-2.5 overflow-x-auto [&::-webkit-scrollbar]:hidden w-full max-w-page mx-auto">
          {renderTabs()}
        </div>
      </nav>
    </>
  );
}
