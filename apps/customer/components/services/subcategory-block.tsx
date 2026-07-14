'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ServiceCard } from './service-card';
import type { Subcategory } from '../../lib/services-data';

export function SubcategoryBlock({
  subcategory,
  categorySlug,
}: {
  subcategory: Subcategory;
  categorySlug: string;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // Check if desktop
    const isLargeScreen = window.innerWidth >= 1024;
    setIsDesktop(isLargeScreen);

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 280;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Enable horizontal scrolling with mouse wheel
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <div id={subcategory.slug} className="scroll-mt-28">
      {/* Subcategory Header */}
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-[15px] font-bold text-ink">{subcategory.name}</h3>
        <p className="text-[12px] text-muted font-medium">{subcategory.description}</p>
      </div>

      {/* Services Horizontal Scroll Container */}
      <div className="group relative">
        {/* Left Arrow - Desktop Only */}
        {isDesktop && canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-2 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-ink" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="overflow-x-auto scrollbar-hide px-8 sm:px-0"
        >
          <div className="inline-flex gap-3 pb-2">
            {subcategory.services.map((s) => (
              <div key={s.id} className="w-40 shrink-0">
                <ServiceCard service={s} categorySlug={categorySlug} icon={subcategory.icon} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Arrow - Desktop Only */}
        {isDesktop && canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-2 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-ink" />
          </button>
        )}
      </div>
    </div>
  );
}
