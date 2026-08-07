import type { HomepageReview } from '../lib/homepage-data';
import { ReviewAvatar } from './review-avatar';
import { Reveal } from '@urban-assist/ui';
import { Star } from 'lucide-react';

interface TestimonialsProps {
  reviews: HomepageReview[];
}

function Stars({ rating, size }: { rating: number; size: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${size} fill-amber text-amber`}
          aria-hidden="true"
          strokeWidth={i < rating ? 0 : 1.5}
        />
      ))}
    </div>
  );
}

export function Testimonials({ reviews }: TestimonialsProps) {
  if (reviews.length === 0) return null;

  const [featured, ...rest] = reviews;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-page px-6">
        <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
          Reviews
        </p>
        <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight text-ink">
          Trusted in real homes
        </h2>
        <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-muted">
          Trusted by thousands of UK households
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[3fr,2fr]">
          <Reveal>
            <figure className="rounded-2xl bg-ink p-8 text-white">
              <Stars rating={featured.rating} size="h-4 w-4" />
              <blockquote className="mt-4 text-[17px] leading-relaxed">
                {featured.comment}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <ReviewAvatar name={featured.authorName} src={featured.avatarUrl} />
                <div>
                  <span className="block text-[14px] font-bold text-white">
                    {featured.authorName}
                  </span>
                  <span className="text-[12px] text-footer-muted">{featured.location}</span>
                </div>
              </figcaption>
            </figure>
          </Reveal>

          <div className="divide-y divide-hairline">
            {rest.slice(0, 2).map((r, i) => (
              <Reveal key={r.id} index={i}>
                <figure className="py-5 first:pt-0">
                  <Stars rating={r.rating} size="h-3.5 w-3.5" />
                  <blockquote className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-charcoal">
                    {r.comment}
                  </blockquote>
                  <figcaption className="mt-3 flex items-center gap-2.5">
                    <ReviewAvatar name={r.authorName} src={r.avatarUrl} className="h-7 w-7 text-[10px]" />
                    <span className="text-[12px] font-bold text-ink">{r.authorName}</span>
                    <span className="text-[12px] text-muted">{r.location}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
