import { BadgeCheck, PoundSterling, ShieldCheck, CalendarCheck } from 'lucide-react';
import { Reveal } from '@urban-assist/ui';

const reasons = [
  {
    icon: BadgeCheck,
    title: 'Background Verified Pros',
    desc: 'Every professional is ID-verified and background-checked.',
  },
  {
    icon: PoundSterling,
    title: 'Transparent Pricing',
    desc: 'See the full price upfront. No hidden fees, no surprises.',
  },
  {
    icon: ShieldCheck,
    title: 'Insurance Coverage',
    desc: 'All services are covered by public liability insurance.',
  },
  {
    icon: CalendarCheck,
    title: 'Flexible Rescheduling',
    desc: 'Change your booking anytime with zero cancellation fees.',
  },
];

export function WhyUs() {
  return (
    <section className="bg-bg py-16">
      <div className="mx-auto max-w-page px-6">
        <p className="font-mono-utility text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
          Why Urban Assist
        </p>
        <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight text-ink">
          The boring stuff, guaranteed
        </h2>
        <div className="mt-10 grid gap-x-12 gap-y-0 md:grid-cols-2">
          {reasons.map((r, i) => {
            const Icon = r.icon;
            return (
              <Reveal key={r.title} index={i}>
                <div className="flex gap-4 border-t border-hairline py-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber/10">
                    <Icon className="h-5 w-5 text-amber-deep" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-ink">{r.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{r.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
