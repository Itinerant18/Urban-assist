'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { getAllServicesFlat } from '../../lib/services-data';

// Flat list is static taxonomy data — build it once at module load.
const ALL_SERVICES = getAllServicesFlat();

export function ServiceSearch({ inputClassName = 'bg-white' }: { inputClassName?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return ALL_SERVICES.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.categoryName.toLowerCase().includes(term) ||
        s.subcategoryName.toLowerCase().includes(term),
    ).slice(0, 8);
  }, [q]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q.trim()) router.push(`/browse?q=${encodeURIComponent(q.trim())}`);
        }}
        placeholder="Search services, providers..."
        className={`w-full rounded-xl border border-hairline bg-white py-3 pl-11 pr-4 text-[13px] text-ink placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition ${inputClassName}`}
        style={{ minHeight: 44 }}
      />
      {q.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-hairline bg-white p-5 shadow-lg">
          <p className="text-[13px] text-ink font-medium">No services match &quot;{q.trim()}&quot;</p>
          <Link href="/services" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:text-accent-hover transition">
            Browse all services <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      {results.length > 0 && (
        <ul className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-hairline bg-white shadow-lg">
          {results.map((s, idx) => (
            <li key={`${s.categorySlug}-${s.id}`} className={idx > 0 ? 'border-t border-hairline/50' : ''}>
              <Link
                href={`/services/${s.categorySlug}/${s.slug}`}
                className="flex items-center justify-between px-4 py-3 text-[13px] hover:bg-accent/5 transition group"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-ink block">{s.name}</span>
                  <span className="text-[11px] text-muted">{s.categoryName}</span>
                </div>
                <ArrowRight className="ml-3 shrink-0 h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
