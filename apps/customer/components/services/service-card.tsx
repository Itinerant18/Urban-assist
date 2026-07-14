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
      className="group flex flex-col rounded-xl border border-hairline bg-white p-5 transition-all hover:border-accent hover:shadow-md hover:shadow-accent/20"
    >
      {/* Icon container with gradient background */}
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 transition-all group-hover:from-accent/20 group-hover:to-accent/10">
        <Icon className="h-5 w-5 text-accent transition-transform group-hover:scale-110" />
      </span>
      
      {/* Content */}
      <h4 className="mt-4 text-[14px] font-bold leading-snug text-ink group-hover:text-accent transition">{service.name}</h4>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{service.description}</p>
      
      {/* Footer with price and badge */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-hairline/50">
        <span className="text-[13px] font-bold text-ink">From <span className="text-accent font-extrabold">{pence(service.minPricePence)}</span></span>
        {service.isPopular && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
            ⭐ Popular
          </span>
        )}
      </div>
    </Link>
  );
}
