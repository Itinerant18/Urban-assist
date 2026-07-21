import Link from 'next/link';
import {
  Briefcase,
  Users,
  Search,
  ScrollText,
  ChevronRight,
  ShieldAlert,
  CalendarDays,
  Star,
  BarChart3,
  Tag,
  Percent,
  Wallet,
  LayoutGrid,
  TicketCheck,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PageHeader, TableTile } from '@/components/bento';

const links = [
  { href: '/bookings', label: 'Bookings', icon: Briefcase },
  { href: '/scheduling', label: 'Scheduling', icon: CalendarDays },
  { href: '/services', label: 'Services', icon: LayoutGrid },
  { href: '/providers', label: 'Providers', icon: Users },
  { href: '/customers', label: 'Customers', icon: UserRound },
  { href: '/staff', label: 'Staff Roles', icon: ShieldAlert },
  { href: '/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { href: '/financials', label: 'Financials', icon: Wallet },
  { href: '/pricing', label: 'Pricing', icon: Percent },
  { href: '/promotions', label: 'Promotions', icon: Tag },
  { href: '/ratings', label: 'Ratings', icon: Star },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/tickets', label: 'Tickets', icon: TicketCheck },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="More" subtitle="All admin sections." />

      <TableTile>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between gap-3 px-5 py-3 min-h-[44px] hover:bg-bg/60 transition-colors"
          >
            <span className="flex items-center gap-3 text-sm font-medium text-ink">
              <Icon className="h-4 w-4 text-muted" aria-hidden />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
          </Link>
        ))}
      </TableTile>
    </div>
  );
}
