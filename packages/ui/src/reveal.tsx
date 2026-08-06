// Reveal — IntersectionObserver entrance. Deliberately NOT framer-motion:
// dropping framer's whileInView into an every-page wrapper adds ~30KB gz per
// route, so this stays CSS+IO and framer stays quarantined to LiveStatusTrack.
//
// Motion rule of the house:
//   CSS/Tailwind — state micro-interactions, entrances, draws, accordions
//                  (auto-covered by the prefers-reduced-motion blanket).
//   framer-motion — orchestrated/continuous/gesture only, MUST call
//                  useReducedMotion. JS media (video) checks matchMedia itself.
//
// SSR behaviour: the hidden state (`opacity-0 translate-y-3`) is applied only
// AFTER mount, so the server paints the visible state — no blank-section
// flash, no CLS, and the section is readable before hydration completes.
'use client';
import * as React from 'react';
import { cn } from './cn';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger index — delay = min(60ms × index, 300ms). */
  index?: number;
}

export function Reveal({ children, className, index = 0 }: RevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = React.useState<'initial' | 'hidden' | 'shown'>('initial');

  React.useEffect(() => {
    // Post-mount only: enables the transition classes and marks the element
    // hidden in the SAME commit — the browser sees the transition property
    // appear alongside the hidden state, so nothing animates away.
    setPhase('hidden');

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase('shown');
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const delay = Math.min(60 * index, 300);

  return (
    <div
      ref={ref}
      style={phase === 'shown' ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        phase !== 'initial' && 'transition-[opacity,transform] duration-base ease-out-soft',
        phase === 'hidden' && 'opacity-0 translate-y-3',
        phase === 'shown' && 'opacity-100 translate-y-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
