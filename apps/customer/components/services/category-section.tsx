import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCategoryIcon, type Category } from '../../lib/services-data';
import { SubcategoryBlock } from './subcategory-block';

export function CategorySection({ category }: { category: Category }) {
  const Icon = getCategoryIcon(category.icon);
  const tint = category.color ?? '#1F3A4D';
  return (
    <section id={category.slug} className="scroll-mt-[136px]">
      {/* Section Header */}
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-hairline/50 pb-5">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br transition-transform hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${tint}20, ${tint}05)` }}
          >
            <Icon className="h-6 w-6" style={{ color: tint }} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[24px] font-bold text-ink">{category.name}</h2>
            <p className="mt-1 text-[13px] text-muted leading-relaxed">{category.description}</p>
          </div>
        </div>
        <Link
          href={`/services/${category.slug}`}
          className="hidden shrink-0 items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-[13px] font-semibold text-accent transition hover:bg-accent/20 hover:text-accent sm:inline-flex"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      {/* Subcategories */}
      <div className="space-y-7">
        {category.subcategories.map((sub) => (
          <SubcategoryBlock key={sub.id} subcategory={sub} categorySlug={category.slug} />
        ))}
      </div>
    </section>
  );
}
