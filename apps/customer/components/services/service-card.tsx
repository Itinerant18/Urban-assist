import Link from 'next/link';
import { pence } from '@urban-assist/lib';
import { getCategoryIcon, type ServiceItem } from '../../lib/services-data';

interface ServiceCardProps {
  service: ServiceItem;
  categorySlug: string;
  /** Icon name to render (usually the parent subcategory's icon). */
  icon?: string;
}

export function ServiceCard({ service, categorySlug, icon }: ServiceCardProps) {
  const Icon = getCategoryIcon(service.icon ?? icon ?? 'sparkles');
  return (
    <Link
      href={`/services/${categorySlug}/${service.slug}`}
      className="group flex flex-col rounded-xl border border-hairline bg-white transition-all hover:border-accent hover:shadow-md hover:shadow-accent/20 overflow-hidden"
    >
      {/* Top: Square Image/Icon Area - Full Width */}
      <div className="relative aspect-square w-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5 transition-all group-hover:from-accent/20 group-hover:to-accent/10">
        <Icon className="h-20 w-20 text-accent transition-transform group-hover:scale-110" />
      </div>
      
      {/* Bottom: Content Area */}
      <div className="flex flex-col flex-1 justify-between p-5">
        {/* Title and Description */}
        <div>
          <h4 className="text-[14px] font-bold leading-snug text-ink group-hover:text-accent transition line-clamp-2">{service.name}</h4>
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted">{service.description}</p>
        </div>
        
        {/* Divider */}
        <div className="my-3 h-px bg-hairline/50" />
        
        {/* Footer with price and badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-ink">From <span className="text-accent font-extrabold">{pence(service.minPricePence)}</span></span>
          {service.isPopular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent shrink-0">
              ⭐ Popular
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
