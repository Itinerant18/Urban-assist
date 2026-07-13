import Link from 'next/link';
import { Apple, Play } from 'lucide-react';

function StoreBadge({ href, icon, top, bottom }: { href: string; icon: React.ReactNode; top: string; bottom: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg bg-[#10151A] border border-white/10 px-4 py-2 text-white hover:bg-black transition"
    >
      {icon}
      <span className="leading-tight text-left">
        <span className="block text-[10px] font-medium opacity-80">{top}</span>
        <span className="block text-[13px] font-bold">{bottom}</span>
      </span>
    </Link>
  );
}

export function StoreBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <StoreBadge
        href="/coming-soon"
        icon={<Apple className="h-6 w-6 shrink-0" />}
        top="Download on the"
        bottom="App Store"
      />
      <StoreBadge
        href="/coming-soon"
        icon={<Play className="h-6 w-6 shrink-0 fill-current" />}
        top="Get it on"
        bottom="Google Play"
      />
    </div>
  );
}
