"use client";

import { useState, useEffect } from 'react';
import { getCategoryIcon, type Category } from '../../lib/services-data';
import { cn } from '../../lib/utils';

// Sticky notch-styled category navigation with active-state scroll spy.
export function CategoryTabs({ categories }: { categories: Category[] }) {
  const [activeSlug, setActiveSlug] = useState<string>('');

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

  return (
    <nav className="sticky top-[56px] z-30 -mx-4 flex h-16 px-0 bg-transparent lg:top-[64px] lg:-mx-6">
      {/* Left Side Bar - Flexible width with border-bottom */}
      <div className="flex-1 h-10 bg-bg/95 backdrop-blur-md z-20 relative min-w-0">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <line 
            x1="0" 
            y1="39.5" 
            x2="100%" 
            y2="39.5" 
            stroke="currentColor" 
            className="text-hairline" 
            strokeWidth={1} 
          />
        </svg>
      </div>

      {/* Notch Container - Curved Floating Bar */}
      <div className="flex h-16 relative z-10 shrink-0 -ml-px w-full max-w-[92vw] sm:max-w-[85vw] md:max-w-4xl lg:max-w-[1200px] mx-auto overflow-hidden">
        
        {/* Scrollable Categories List (renders behind curve overlays) */}
        <div className="absolute inset-0 z-10 bg-white flex items-end pb-2.5 pl-[40px] pr-[40px] sm:pl-[50px] sm:pr-[50px]">
          <div 
            className="flex gap-2.5 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((c) => {
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
            })}
          </div>
        </div>

        {/* Center Bottom Border Line */}
        <svg className="absolute inset-x-0 bottom-0 w-full h-[2px] pointer-events-none z-15" preserveAspectRatio="none">
          <line x1="0" y1="1.5" x2="100%" y2="1.5" stroke="currentColor" className="text-hairline" strokeWidth={1} />
        </svg>

        {/* Left Curve Overlay */}
        <div className="absolute left-0 top-0 bottom-0 w-[40px] sm:w-[50px] z-20 pointer-events-none">
          {/* Mobile curve (40px) */}
          <div className="absolute inset-0 sm:hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 64">
              {/* Fill region below curve with background cream color */}
              <path d="M0 40 C20 40 20 64 40 64 V64 H0 Z" fill="currentColor" className="text-bg" />
              {/* Stroke outline */}
              <path d="M0 39.5 C20 39.5 20 63.5 40 63.5" fill="none" stroke="currentColor" className="text-hairline" strokeWidth={1} />
            </svg>
          </div>
          {/* Tablet/Desktop curve (50px) */}
          <div className="hidden sm:block absolute inset-0">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 50 64">
              {/* Fill region below curve with background cream color */}
              <path d="M0 40 C25 40 25 64 50 64 V64 H0 Z" fill="currentColor" className="text-bg" />
              {/* Stroke outline */}
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="currentColor" className="text-hairline" strokeWidth={1} />
            </svg>
          </div>
        </div>

        {/* Right Curve Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-[40px] sm:w-[50px] z-20 pointer-events-none">
          {/* Mobile curve (40px) */}
          <div className="absolute inset-0 sm:hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 64">
              {/* Fill region below curve with background cream color */}
              <path d="M0 64 C20 64 20 40 40 40 V64 H0 Z" fill="currentColor" className="text-bg" />
              {/* Stroke outline */}
              <path d="M0 63.5 C20 63.5 20 39.5 40 39.5" fill="none" stroke="currentColor" className="text-hairline" strokeWidth={1} />
            </svg>
          </div>
          {/* Tablet/Desktop curve (50px) */}
          <div className="hidden sm:block absolute inset-0">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 50 64">
              {/* Fill region below curve with background cream color */}
              <path d="M0 64 C25 64 25 40 50 40 V64 H0 Z" fill="currentColor" className="text-bg" />
              {/* Stroke outline */}
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="currentColor" className="text-hairline" strokeWidth={1} />
            </svg>
          </div>
        </div>

      </div>

      {/* Right Side Bar - Flexible width with border-bottom */}
      <div className="flex-1 h-10 bg-bg/95 backdrop-blur-md z-20 relative min-w-0 -ml-px">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <line 
            x1="0" 
            y1="39.5" 
            x2="100%" 
            y2="39.5" 
            stroke="currentColor" 
            className="text-hairline" 
            strokeWidth={1} 
          />
        </svg>
      </div>
    </nav>
  );
}
