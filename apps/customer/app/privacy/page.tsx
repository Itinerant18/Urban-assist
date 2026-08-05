import Link from 'next/link';
import { LegalPage, Section } from '../../components/legal-page';

export const metadata = {
  title: 'Privacy Notice — Urban Assist',
  description:
    'How Urban Assist collects, uses and protects your personal data, and the rights you have under UK GDPR.',
};

/**
 * Written from what the code actually does — the tables `exportUserData` reads,
 * the processors in packages/integrations, and the deletion path in
 * account-service.ts. Nothing here describes processing the platform does not do.
 *
 * The bracketed identifiers are the only facts this file cannot derive: the
 * registered entity, its address, and its ICO registration number. Those must be
 * filled in before launch; everything else is accurate today.
 */
export default function Privacy() {
  return (
    <LegalPage
      title="Privacy notice"
      updated="5 August 2026"
      intro="This notice explains what personal data Urban Assist collects when you book home services, why we hold it, how long we keep it, and the rights you have over it under the UK GDPR and the Data Protection Act 2018."
    >
      <Section title="Who we are">
        <p>
          Urban Assist is operated by [registered company name], [registered address], company
          number [company number]. We are the data controller for the personal data described here
          and are registered with the Information Commissioner&rsquo;s Office under registration
          [ICO registration number].
        </p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li>
            <strong>Account details</strong> — your name, email address and mobile number. We use
            one-time codes rather than passwords, so we never hold a password for your account.
          </li>
          <li>
            <strong>Addresses</strong> — the service addresses you save, including postcode and the
            approximate coordinates we derive from it so we can match you with nearby professionals.
          </li>
          <li>
            <strong>Bookings and payments</strong> — what you booked, when, the price, and whether
            you paid by card or cash. Card details are entered directly into Stripe and never reach
            our servers.
          </li>
          <li>
            <strong>Messages and reviews</strong> — chat with your professional about a job, and any
            rating or review you leave afterwards.
          </li>
          <li>
            <strong>Device and usage data</strong> — the technical information needed to keep you
            signed in, and, only if you turn it on, a push-notification token for this device.
          </li>
        </ul>
      </Section>

      <Section title="Why we use it, and our lawful basis">
        <ul>
          <li>
            <strong>To provide the service you asked for</strong> — creating a booking, assigning a
            professional, taking payment, and letting the two of you message each other.{' '}
            <em>Lawful basis: performance of a contract.</em>
          </li>
          <li>
            <strong>To keep both sides safe</strong> — identity and right-to-work checks on
            professionals, fraud prevention, and resolving disputes about a job.{' '}
            <em>Lawful basis: legitimate interests.</em>
          </li>
          <li>
            <strong>To meet legal obligations</strong> — retaining transaction and VAT records.{' '}
            <em>Lawful basis: legal obligation.</em>
          </li>
          <li>
            <strong>To send optional messages</strong> — push notifications and marketing emails.{' '}
            <em>Lawful basis: consent</em>, which you can withdraw at any time in{' '}
            <Link href="/account">your account settings</Link>.
          </li>
        </ul>
      </Section>

      <Section title="Who we share it with">
        <p>We do not sell your personal data. We share only what each party needs to do its job:</p>
        <ul>
          <li>
            <strong>Your assigned professional</strong> — your first name, the service address, the
            job details, and a contact route through the app. They see your address only once a
            booking has been assigned to them.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing. Stripe is the controller of your card
            data.
          </li>
          <li>
            <strong>Supabase</strong> — our database and authentication host.
          </li>
          <li>
            <strong>Google Firebase</strong> — delivery of push notifications, only if you have
            enabled them.
          </li>
          <li>
            <strong>Postcodes.io and getAddress.io</strong> — turning a postcode into an address
            list and coordinates. We send the postcode; we do not send your name.
          </li>
          <li>
            <strong>Google Maps</strong> — the map previews on a booking, loaded from Google when
            you open that screen.
          </li>
        </ul>
      </Section>

      <Section title="How long we keep it">
        <p>
          Booking, payment and VAT records are kept for six years after the end of the relevant tax
          year, as UK tax law requires. Messages and reviews attached to a booking are kept as long
          as that booking record. Everything else is deleted when you close your account.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You have the right to access your data, correct it, delete it, restrict or object to how
          we use it, and to receive it in a portable format. Two of these are built into the app:
          from <Link href="/account">your account</Link> you can download everything we hold about
          you, and you can permanently delete your account. Deletion removes your profile,
          addresses, messages and reviews; it does not remove the financial records we are legally
          required to keep, which are retained without your contact details attached.
        </p>
        <p>
          To exercise any other right, email{' '}
          <a href="mailto:support@urbanassist.co.uk">support@urbanassist.co.uk</a>. If you are not
          satisfied with our response you can complain to the Information Commissioner&rsquo;s
          Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a> or on 0303 123
          1113.
        </p>
      </Section>

      <Section title="Cookies and similar technologies">
        <p>
          We use strictly necessary cookies to keep you signed in and to remember the postcode you
          last searched. We do not use advertising or cross-site tracking cookies, so no consent
          banner is required. If that changes, this notice will be updated first.
        </p>
      </Section>

      <Section title="Where your data is held">
        <p>
          Your data is stored in the United Kingdom or the European Economic Area. Where a processor
          transfers data outside the UK, that transfer relies on UK adequacy regulations or the
          International Data Transfer Addendum to the EU Standard Contractual Clauses.
        </p>
      </Section>

      <Section title="Changes to this notice">
        <p>
          If we change how we use your data we will update this page and, where the change is
          significant, tell you directly before it takes effect.
        </p>
      </Section>
    </LegalPage>
  );
}
