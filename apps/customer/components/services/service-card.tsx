import Link from 'next/link';
import { pence } from '@urban-assist/lib';
import { getCategoryIcon, type ServiceItem } from '../../lib/services-data';

interface ServiceCardProps {
  service: ServiceItem;
  categorySlug: string;
  subcategorySlug?: string;
  /** Icon name to render (usually the parent subcategory's icon). */
  icon?: string;
}

export function ServiceCard({ service, categorySlug, subcategorySlug, icon }: ServiceCardProps) {
  const Icon = getCategoryIcon(service.icon ?? icon ?? 'sparkles');
  const href = subcategorySlug
    ? `/services/${categorySlug}/${subcategorySlug}/${service.slug}`
    : `/services/${categorySlug}/${service.slug}`;
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-hairline bg-white transition-all hover:border-accent hover:shadow-sm hover:shadow-accent/20 overflow-hidden"
    >
      {/* Top: Square Image/Icon Area - Compact */}
      <div className="relative aspect-square w-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5 transition-all group-hover:from-accent/20 group-hover:to-accent/10">
        <Icon className="h-16 w-16 text-accent transition-transform group-hover:scale-105" />
      </div>
      
      {/* Bottom: Content Area - Compact */}
      <div className="flex flex-col flex-1 justify-between p-3">
        {/* Title and Description */}
        <div>
          <h4 className="text-[13px] font-bold leading-tight text-ink group-hover:text-accent transition line-clamp-1">{service.name}</h4>
          <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted">{service.description}</p>
        </div>
        
        {/* Divider - Thinner */}
        <div className="my-2 h-px bg-hairline/50" />
        
        {/* Footer with price and badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-ink">From <span className="text-accent font-extrabold">{pence(service.minPricePence)}</span></span>
          {service.isPopular && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent shrink-0">
              ⭐ Popular
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
