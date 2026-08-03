import Link from 'next/link';
import { KeyRound, Plug, ScrollText, Settings, ShieldCheck, Tag } from 'lucide-react';

import { PageHeader, BentoTile, BentoGrid } from '@/components/bento';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  {
    href: '/settings/account',
    icon: KeyRound,
    title: 'Account',
    description: 'Change your password. MFA stays enrolled on this account.',
  },
  {
    href: '/staff',
    icon: ShieldCheck,
    title: 'Admin roles',
    description: 'Invite admins, assign roles, view workload and the access policy.',
  },
  {
    href: '/audit',
    icon: ScrollText,
    title: 'Audit log',
    description: 'Immutable admin actions, filters and CSV export.',
  },
  {
    href: '/pricing',
    icon: Tag,
    title: 'Pricing modifiers',
    description: 'Region and time-of-day percent adjustments on platform prices.',
  },
  {
    href: '/settings/integrations',
    icon: Plug,
    title: 'Integrations',
    description: 'Configuration status of Stripe, Twilio, Firebase, Upstash and Supabase.',
  },
] as const;

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Platform administration."
        action={<Settings className="h-5 w-5 text-muted" aria-hidden />}
      />
      <BentoGrid>
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="col-span-2 md:col-span-3 lg:col-span-4">
            <BentoTile static className="h-full !justify-start transition-colors hover:bg-bg/60">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-xs text-muted">{description}</p>
                </div>
              </div>
            </BentoTile>
          </Link>
        ))}
      </BentoGrid>
    </div>
  );
}
