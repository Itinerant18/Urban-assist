import { ServiceCard } from './service-card';
import type { Subcategory } from '../../lib/services-data';

export function SubcategoryBlock({
  subcategory,
  categorySlug,
}: {
  subcategory: Subcategory;
  categorySlug: string;
}) {
  return (
    <div id={subcategory.slug} className="scroll-mt-28">
      {/* Subcategory Header */}
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-[15px] font-bold text-ink">{subcategory.name}</h3>
        <p className="text-[12px] text-muted font-medium">{subcategory.description}</p>
      </div>
      
      {/* Services Horizontal Scroll */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="inline-flex gap-3 pb-2">
          {subcategory.services.map((s) => (
            <div key={s.id} className="w-40 shrink-0">
              <ServiceCard service={s} categorySlug={categorySlug} icon={subcategory.icon} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
