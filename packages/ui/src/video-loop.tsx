// VideoLoop — muted autoplay video slot, poster-first.
//
// Videos are video-READY today: slots ship with a poster (defaults to
// `<src>-poster.webp`); dropping the `<src>.mp4` later turns the slot into
// a real loop with ZERO code change. Until then it renders as a still.
//
// Lazy rules (researched: muted autoplay loops are fine when 10-20s, <2MB,
// `muted playsinline loop`, paused offscreen):
//   - preload="none": no video bytes until first intersection.
//   - the <source> is attached on first intersect — true lazy, never blocks
//     the critical path; poster is the LCP element, never the video.
//   - pause on leave, play on re-enter.
//   - prefers-reduced-motion: renders the poster <img> only — the CSS motion
//     blanket cannot stop a <video>, so this matchMedia check is the reason
//     the component exists.
'use client';
import * as React from 'react';

interface VideoLoopProps {
  /** Extensionless base path, e.g. `/media/loops/cleaning-loop`. */
  src: string;
  /** Poster override; defaults to `${src}-poster.webp`. */
  poster?: string;
  className?: string;
  alt?: string;
}

export function VideoLoop({ src, poster, className, alt = '' }: VideoLoopProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [reduce, setReduce] = React.useState(false);
  const posterUrl = poster ?? `${src}-poster.webp`;

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (!video.querySelector('source')) {
            const source = document.createElement('source');
            source.src = `${src}.mp4`;
            source.type = 'video/mp4';
            video.append(source);
            video.load();
          }
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: '150px 0px' },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src, reduce]);

  if (reduce) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={posterUrl} alt={alt} className={className} loading="lazy" />;
  }

  return (
    <video
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      poster={posterUrl}
      aria-label={alt || undefined}
    />
  );
}
