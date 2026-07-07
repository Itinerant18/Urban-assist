import Link from 'next/link';
import { Construction } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10">
        <Construction className="h-8 w-8 text-accent" />
      </span>
      <h1 className="mt-6 text-[28px] font-extrabold text-ink">Coming Soon</h1>
      <p className="mt-2 max-w-sm text-[14px] text-muted">
        We&apos;re working on this page. Check back soon!
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover"
      >
        Back to Home
      </Link>
    </div>
  );
}
