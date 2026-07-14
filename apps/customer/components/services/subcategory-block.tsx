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
      <div className="mb-5 flex items-baseline gap-3">
        <h3 className="text-[16px] font-bold text-ink">{subcategory.name}</h3>
        <p className="text-[13px] text-muted font-medium">{subcategory.description}</p>
      </div>
      
      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subcategory.services.map((s) => (
          <ServiceCard key={s.id} service={s} categorySlug={categorySlug} icon={subcategory.icon} />
        ))}
      </div>
    </div>
  );
}
