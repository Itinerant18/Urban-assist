import Link from 'next/link';
import { Briefcase, Users, Search, ScrollText, ChevronRight, ShieldAlert } from 'lucide-react';

const links = [
  { href: '/bookings', label: 'Bookings', icon: Briefcase },
  { href: '/providers', label: 'Users & Providers', icon: Users },
  { href: '/staff', label: 'Staff Roles', icon: ShieldAlert },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText },
];

export default function MorePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">More</h1>
        <p className="text-sm text-muted mt-1">All admin sections.</p>
      </div>

      <div className="flex flex-col gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="card flex items-center justify-between">
            <span className="flex items-center gap-3 text-sm font-medium text-ink">
              <Icon className="h-4 w-4 text-muted" />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
