import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCategoryIcon, type Category } from '../../lib/services-data';
import { SubcategoryBlock } from './subcategory-block';

export function CategorySection({ category }: { category: Category }) {
  const Icon = getCategoryIcon(category.icon);
  const tint = category.color ?? '#1F3A4D';
  return (
    <section id={category.slug} className="scroll-mt-[136px]">
      <div className="mb-5 flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ background: `${tint}14` }}
        >
          <Icon className="h-5 w-5" style={{ color: tint }} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-extrabold text-ink">{category.name}</h2>
          <p className="text-[13px] text-muted">{category.description}</p>
        </div>
        <Link
          href={`/services/${category.slug}`}
          className="hidden shrink-0 items-center gap-1 text-[13px] font-semibold text-accent hover:text-accent-hover sm:flex"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="space-y-8">
        {category.subcategories.map((sub) => (
          <SubcategoryBlock key={sub.id} subcategory={sub} categorySlug={category.slug} />
        ))}
      </div>
    </section>
  );
}
