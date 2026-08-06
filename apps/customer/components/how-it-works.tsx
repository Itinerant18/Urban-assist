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
    <section className="bg-bg py-12">
      <div className="mx-auto max-w-page px-6">
        <h2 className="mb-2 text-center text-[26px] font-extrabold text-ink">
          Book without the phone-tag
        </h2>
        <p className="mb-10 text-center text-[14px] text-muted">
          Three steps between you and a sorted home.
        </p>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} index={i}>
              <li className="flex h-full flex-col items-center rounded-2xl border border-hairline bg-white p-6 text-center shadow-sm">
                <span className="relative mb-4 grid h-32 w-32 place-items-center rounded-2xl bg-bg">
                  <StepArt index={i + 1} className="h-32 w-32 rounded-2xl object-cover" />
                  <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-ink text-[13px] font-extrabold text-white shadow-md">
                    {i + 1}
                  </span>
                </span>
                <h3 className="text-[15px] font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.detail}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="mt-8 text-center">
          <Link
            href="/services"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover"
          >
            Browse services <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
