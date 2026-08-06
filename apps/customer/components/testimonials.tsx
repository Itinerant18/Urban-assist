import type { HomepageReview } from '../lib/homepage-data';
import { ReviewAvatar } from './review-avatar';

interface TestimonialsProps {
  reviews: HomepageReview[];
}

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function Testimonials({ reviews }: TestimonialsProps) {
  if (reviews.length === 0) return null;

  return (
    <section className="bg-bg py-12">
      <div className="mx-auto max-w-page px-6">
        <h2 className="mb-2 text-center text-[26px] font-extrabold text-ink">
          What our customers say
        </h2>
        <p className="mb-8 text-center text-[14px] text-muted">
          Trusted by thousands of UK households
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {reviews.slice(0, 3).map((r) => (
            <div key={r.id} className="card-shadow card rounded-xl p-6">
              <div className="text-[18px] tracking-[2px]" style={{ color: '#D9A441' }}>
                {stars(r.rating)}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink">{r.comment}</p>
              <div className="mt-4 flex items-center gap-3 border-t border-hairline pt-3">
                <ReviewAvatar name={r.authorName} src={r.avatarUrl} />
                <div className="min-w-0">
                  <span className="block text-[14px] font-bold text-ink">{r.authorName}</span>
                  <span className="text-[12px] text-muted">{r.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
