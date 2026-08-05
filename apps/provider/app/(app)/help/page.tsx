import Link from 'next/link';
import { Card } from '@urban-assist/ui';
import { LifeBuoy } from 'lucide-react';
import { OFFER_TTL_LABEL } from '@urban-assist/lib';

export const metadata = { title: 'Help & support — Urban Assist Pro' };

/**
 * App-usage FAQ only. Anything that would be a contractual or legal statement
 * (payment terms, liability, cancellation penalties) is deliberately absent — that
 * copy has not been written or reviewed, and inventing it here would make it look
 * authoritative. Those questions route to support.
 */
const FAQ_SECTIONS: { title: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    title: 'Jobs and offers',
    items: [
      {
        q: 'Why am I not receiving job offers?',
        a: (
          <>
            Offers only reach you when you are online, your documents are verified, and you have at
            least one active service. Check the status toggle on your{' '}
            <Link href="/" className="underline hover:text-ink">
              dashboard
            </Link>
            , then your{' '}
            <Link href="/documents" className="underline hover:text-ink">
              documents
            </Link>{' '}
            and{' '}
            <Link href="/services" className="underline hover:text-ink">
              services
            </Link>
            .
          </>
        ),
      },
      {
        q: 'How long do I have to accept an offer?',
        a: (
          <>
            {OFFER_TTL_LABEL}. After that the job is offered to the next available provider. Turn on push
            notifications in{' '}
            <Link href="/settings" className="underline hover:text-ink">
              settings
            </Link>{' '}
            so you see offers when the app is closed.
          </>
        ),
      },
      {
        q: 'Does declining affect how much work I get?',
        a: 'Yes. Your acceptance rate is one of three factors used to rank providers for a job, alongside distance and rating. You can see all three on your performance page.',
      },
      {
        q: 'The customer is not at the address. What do I do?',
        a: 'Try calling them from the job screen first. If you still cannot reach them, raise a support ticket from your account page before leaving, so the job is recorded correctly.',
      },
    ],
  },
  {
    title: 'Starting and finishing a job',
    items: [
      {
        q: 'What is the 4-digit code?',
        a: 'The customer sees a start code in their app. You enter it to move the job to In progress. It confirms you are at the right job with the right customer.',
      },
      {
        q: 'The customer cannot find their code.',
        a: 'Ask them to open the booking in their app — it is shown on the booking screen. If it is still missing, raise a support ticket rather than starting the job another way.',
      },
      {
        q: 'Do I have to upload a photo when I finish?',
        a: 'A photo and notes are optional but strongly recommended. They are your record of the work if a customer later disputes it.',
      },
    ],
  },
  {
    title: 'Getting paid',
    items: [
      {
        q: 'When do I get paid?',
        a: (
          <>
            Card payments build up as an available balance you withdraw yourself from{' '}
            <Link href="/earnings" className="underline hover:text-ink">
              wallet
            </Link>
            . There is no automatic payout schedule yet. Cash jobs are settled directly with the
            customer.
          </>
        ),
      },
      {
        q: 'Why can I not withdraw?',
        a: (
          <>
            Withdrawals need a connected bank account. Open{' '}
            <Link href="/earnings" className="underline hover:text-ink">
              wallet
            </Link>{' '}
            and choose Set up payouts.
          </>
        ),
      },
      {
        q: 'What is the platform commission?',
        a: 'The exact rate is shown on every offer and on each completed job statement, before you accept. Open a job and choose Job statement to see the full breakdown.',
      },
    ],
  },
  {
    title: 'Your account',
    items: [
      {
        q: 'How do I change my service areas?',
        a: (
          <>
            Coverage is set by our team so dispatch stays consistent. You can see your current areas
            in{' '}
            <Link href="/settings/service-areas" className="underline hover:text-ink">
              settings
            </Link>
            , and request a change through support.
          </>
        ),
      },
      {
        q: 'My verification is still pending.',
        a: 'Documents are reviewed manually. If it has been more than a few working days, raise a ticket and we will chase it.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-5 py-2">
      <header className="space-y-1">
        <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
          Help &amp; support
        </h1>
        <p className="text-sm text-muted">Common questions, and how to reach a person.</p>
      </header>

      <Link href="/account" className="tap block">
        <Card className="!p-4 bg-white flex items-center gap-3 transition hover:border-ink">
          <LifeBuoy className="h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-ink">Raise a support ticket</p>
            <p className="text-xs text-muted">
              Payment disputes, customer issues, verification or app problems.
            </p>
          </div>
        </Card>
      </Link>

      {FAQ_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-hairline bg-white px-4 py-3"
              >
                <summary className="tap cursor-pointer list-none text-sm font-medium text-ink marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-muted transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <div className="mt-2 text-sm text-charcoal leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted">
        Questions about partner terms, insurance or liability are not answered here — raise a ticket
        and we will send you the current documents.
      </p>
    </div>
  );
}
