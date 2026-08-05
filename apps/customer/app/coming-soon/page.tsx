import Link from 'next/link';
import { MapPin, Bell } from 'lucide-react';

interface Props {
  searchParams: { postcode?: string };
}

export default function ComingSoonPage({ searchParams }: Props) {
  const postcode = searchParams.postcode;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10">
        <MapPin className="h-8 w-8 text-accent" />
      </span>
      <h1 className="mt-6 text-[28px] font-extrabold text-ink">
        {postcode ? `We're not in ${postcode.toUpperCase()} yet` : 'Coming Soon'}
      </h1>
      <p className="mt-2 max-w-sm text-[14px] text-muted">
        {postcode
          ? `We're expanding fast and hope to serve ${postcode.toUpperCase()} soon. Leave your details and we'll notify you the moment we launch in your area.`
          : "We're working hard to bring this feature to life. Check back soon!"}
      </p>

      {/* This was a bordered <div> styled as an input with the words "Notify me
          when available" in it — it looked like a control, took no input and
          subscribed nobody. Until there is a waitlist, say what is true. */}
      {postcode && (
        <p className="mt-6 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-input-border bg-white px-4 py-3 text-[14px] text-muted">
          <Bell className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span>
            Not covered yet. Email{' '}
            <a
              href="mailto:support@urbanassist.co.uk"
              className="font-medium text-accent-deep underline underline-offset-2"
            >
              support
            </a>{' '}
            and we&apos;ll tell you when we reach you.
          </span>
        </p>
      )}

      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-[14px] font-bold text-white transition hover:bg-accent-hover"
      >
        Back to Home
      </Link>
    </div>
  );
}
