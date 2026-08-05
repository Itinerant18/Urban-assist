import Link from 'next/link';
import { CANCELLATION_POLICY, VAT_RATE } from '@urban-assist/utils';
import { LegalPage, Section } from '../../components/legal-page';

export const metadata = {
  title: 'Terms of Use — Urban Assist',
  description:
    'The terms on which you book home services through Urban Assist: pricing, payment, cancellation and your consumer rights.',
};

/**
 * Every operational rule below is one the platform actually enforces — the
 * cancellation window comes from CANCELLABLE_STATUSES, the VAT line from
 * VAT_RATE, the assignment model from PRODUCT.md's manual-assignment V1.
 *
 * Bracketed identifiers are the registered-entity facts this file cannot know.
 * Have these reviewed by a solicitor before launch: the sections on liability
 * and the professional relationship carry legal consequence, and this document
 * states the current product behaviour rather than a lawyer's settled position.
 */
export default function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      updated="5 August 2026"
      intro="These terms apply when you use Urban Assist to find and book home services in the UK. They sit alongside your legal rights as a consumer, which nothing here reduces."
    >
      <Section title="Who you are contracting with">
        <p>
          Urban Assist is operated by [registered company name], [registered address], company
          number [company number], VAT registration [VAT number]. We run the platform that connects
          you with independent home-service professionals.
        </p>
      </Section>

      <Section title="How a booking works">
        <p>
          You choose a service and a two-hour arrival window. Those windows are platform
          availability, not a live view of any one professional&rsquo;s diary. Our team then assigns
          a vetted professional to your booking and confirms it in the app. Until that confirmation
          the booking is a request, not an agreement.
        </p>
        <p>
          The professional carries out the work as an independent business, not as our employee. We
          are responsible for the platform, the payment, and the standard we hold professionals to;
          they are responsible for the work itself.
        </p>
      </Section>

      <Section title="Prices and payment">
        <p>
          Prices are fixed and shown in pounds sterling, inclusive of VAT at{' '}
          {(VAT_RATE * 100).toFixed(0)}%. The price you see before you confirm is the price you pay
          for the work described. If the job turns out to need materially more work than you
          described, your professional will tell you before continuing and any change is agreed with
          you first.
        </p>
        <p>
          You can pay by card in the app or in cash directly to the professional on completion. Card
          payments are taken by Stripe. A VAT receipt for every booking is available from{' '}
          <Link href="/bookings">your bookings</Link>.
        </p>
      </Section>

      <Section title="Changing or cancelling">
        <p>{CANCELLATION_POLICY}</p>
        <p>
          Once a professional has set off, the booking can no longer be cancelled in the app —
          contact support and we will deal with it case by case. To move a booking, cancel it and
          book the slot you want.
        </p>
      </Section>

      <Section title="If something goes wrong">
        <p>
          Tell us within a reasonable time and we will work with you and the professional to put it
          right. Under the Consumer Rights Act 2015 a service must be carried out with reasonable
          care and skill; where it has not been, you are entitled to have it done again or to a
          price reduction. Nothing in these terms limits that.
        </p>
        <p>
          Raise a problem from the booking screen or email{' '}
          <a href="mailto:support@urbanassist.co.uk">support@urbanassist.co.uk</a>.
        </p>
      </Section>

      <Section title="Using the platform responsibly">
        <ul>
          <li>Give accurate address and contact details, and access to the property at the agreed time.</li>
          <li>Treat professionals with respect; abusive behaviour ends the booking.</li>
          <li>
            Keep the arrangement on the platform. Taking a job off-platform removes the payment
            protection, insurance position and dispute process that both sides rely on.
          </li>
          <li>Do not misuse the service, attempt to disrupt it, or post false reviews.</li>
        </ul>
        <p>
          We may suspend or close an account that repeatedly breaks these terms. Where we do, we
          will tell you why.
        </p>
      </Section>

      <Section title="Reviews and content">
        <p>
          Reviews you write stay yours; by posting one you allow us to display it on the
          professional&rsquo;s profile. We remove reviews that are abusive, identify third parties,
          or are not about a booking that took place. We do not edit reviews to improve a rating.
        </p>
      </Section>

      <Section title="Our responsibility to you">
        <p>
          We are responsible for loss you suffer that is a foreseeable result of us breaking these
          terms or failing to use reasonable care and skill. We are not responsible for loss that
          was not foreseeable. We do not exclude or limit our liability for death or personal injury
          caused by our negligence, for fraud, or for anything else it would be unlawful to limit.
        </p>
      </Section>

      <Section title="Changes and governing law">
        <p>
          We may update these terms; the version in force is the one published here when you make a
          booking, and we will tell you before a significant change takes effect. These terms are
          governed by the law of England and Wales, and you can bring proceedings in the courts of
          England and Wales — or, if you live in Scotland or Northern Ireland, in your own courts.
        </p>
      </Section>
    </LegalPage>
  );
}
