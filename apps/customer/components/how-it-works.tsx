import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@urban-assist/ui';
import { StepArt } from './step-art';

const STEPS = [
  { title: 'Choose a service', detail: 'See the price before booking.' },
  { title: 'Pick a time', detail: 'Choose a visit window that suits you.' },
  { title: 'We match your pro', detail: 'A vetted professional is assigned.' },
];

// Shared desktop band — used by the home page and service detail.
export function HowItWorks() {
  return (
    <section className="bg-bg py-16">
      <div className="mx-auto max-w-page px-6">
        <div className="grid gap-12 lg:grid-cols-[2fr,3fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
              How it works
            </p>
            <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight text-ink">
              Book without the phone-tag
            </h2>
            <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-muted">
              Three steps between you and a sorted home. No calls, no chasing, no waiting around.
            </p>
            <Link
              href="/services"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover active:scale-[0.98]"
            >
              Browse services <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <ol className="divide-y divide-hairline">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} index={i}>
                <li className="flex items-center gap-6 py-6 first:pt-0">
                  <span className="w-16 shrink-0 select-none text-[64px] font-extrabold leading-none text-ink/[0.08]">
                    0{i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold text-ink">{step.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.detail}</p>
                  </div>
                  <span className="ml-auto hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg sm:block">
                    <StepArt index={i + 1} className="h-full w-full object-cover" />
                  </span>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
