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
      className="group flex flex-row items-stretch rounded-xl border border-hairline bg-white transition-all hover:border-accent hover:shadow-md hover:shadow-accent/20 overflow-hidden"
    >
      {/* Left: Image/Icon Area - Square */}
      <div className="flex shrink-0 items-center justify-center w-32 h-32 bg-gradient-to-br from-accent/10 to-accent/5 transition-all group-hover:from-accent/20 group-hover:to-accent/10">
        <Icon className="h-16 w-16 text-accent transition-transform group-hover:scale-125" />
      </div>
      
      {/* Right: Content Area */}
      <div className="flex flex-col flex-1 justify-between p-5">
        {/* Title and Description */}
        <div>
          <h4 className="text-[14px] font-bold leading-snug text-ink group-hover:text-accent transition line-clamp-2">{service.name}</h4>
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted">{service.description}</p>
        </div>
        
        {/* Footer with price and badge */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-hairline/50">
          <span className="text-[13px] font-bold text-ink">From <span className="text-accent font-extrabold">{pence(service.minPricePence)}</span></span>
          {service.isPopular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-accent shrink-0">
              ⭐ Popular
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
