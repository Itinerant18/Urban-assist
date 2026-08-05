import Link from 'next/link';
import { Logo } from '@urban-assist/ui';

/**
 * Shell for the legal pages. Deliberately plain: no cards, no accent chrome,
 * long measure, generous leading — these are read, not scanned.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-bg">
      <header className="border-b border-hairline bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Urban Assist home">
            <Logo />
            <span className="text-[15px] font-extrabold text-ink">Urban Assist</span>
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <p className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
          Last updated {updated}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-charcoal">{intro}</p>

        <div className="mt-10 space-y-9">{children}</div>

        <footer className="mt-14 border-t border-hairline pt-6 text-sm text-muted">
          <p>
            Questions about this page? Email{' '}
            <a
              href="mailto:support@urbanassist.co.uk"
              className="font-medium text-accent-deep underline underline-offset-2"
            >
              support@urbanassist.co.uk
            </a>
            .
          </p>
          <nav className="mt-4 flex gap-5">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
          </nav>
        </footer>
      </article>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-charcoal [&_a]:font-medium [&_a]:text-accent-deep [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
