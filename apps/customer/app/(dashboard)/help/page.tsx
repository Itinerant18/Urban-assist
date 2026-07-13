'use client';
import * as React from 'react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Card, Badge, Button, Field, Input } from '@urban-assist/ui';
import { ukDateTime } from '@urban-assist/lib';
import { SupportForm } from './support-form';
import Link from 'next/link';
import { Search, CalendarClock, CreditCard, ShieldAlert, MessageSquare, Mail, Phone, BookOpen, ArrowLeft, ThumbsUp, Settings } from 'lucide-react';
import { redirect } from 'next/navigation';

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
}

const FAQS = [
  {
    category: 'Booking Issues',
    q: 'How do I reschedule or cancel a booking?',
    a: 'Open the booking from "Bookings" and use the Cancel button — free any time before the professional is on their way. Card payments are refunded in full. To reschedule, cancel and book a new slot, or message your provider.',
  },
  {
    category: 'Payment & Refunds',
    q: 'When am I charged?',
    a: 'Card payments are taken when you confirm the booking. Cash is paid to the professional after the job — then confirm it in the app.',
  },
  {
    category: 'Payment & Refunds',
    q: 'How do refunds work?',
    a: "Cancel before the professional is en route and card payments refund automatically to the same card, usually within 5–10 working days.",
  },
  {
    category: 'Trust & Safety',
    q: 'Who are the professionals?',
    a: 'Every provider passes identity (KYC) verification before they can take bookings, and carries a public rating from verified customers.',
  },
  {
    category: 'Trust & Safety',
    q: 'What is the 4-digit start code?',
    a: "It's shown on your booking once a professional is assigned. Give it to them on arrival — it confirms the right person starts the job.",
  },
];

const ticketTone: Record<string, 'accent' | 'success' | 'muted' | 'danger'> = {
  open: 'accent',
  in_review: 'accent',
  resolved: 'success',
  closed: 'muted',
};

export default function HelpPage() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: { user: authUser } } = await sb.auth.getUser();
        if (!authUser) {
          window.location.href = '/login';
          return;
        }
        setUser(authUser);

        const { data: t } = await sb
          .from('support_tickets')
          .select('id, category, description, status, created_at')
          .eq('raised_by', authUser.id)
          .order('created_at', { ascending: false })
          .limit(20);
        setTickets(t ?? []);
      } catch (err) {
        console.error('Failed to load tickets', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredFaqs = React.useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const q = searchQuery.toLowerCase();
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-64 bg-hairline rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* Mobile back header */}
      <header className="flex lg:hidden items-center justify-between">
        <Link href="/" className="tap flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-base font-bold text-ink">Help & Support</h1>
        <div className="w-10" />
      </header>

      {/* Header */}
      <div className="hidden lg:block">
        <h1 className="font-display text-xl font-bold text-ink">Help & Support</h1>
        <p className="text-xs text-muted mt-0.5">Find answers to common questions or reach our support team.</p>
      </div>

      {/* Search Help Articles */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          placeholder="Search help articles (e.g. 'Cancel booking', 'Refund')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="tap w-full rounded-xl border border-hairline bg-white pl-10 pr-4 py-3 text-sm text-ink focus:border-ink focus:outline-none shadow-card"
        />
      </div>

      {/* Common Topics Grid */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider pl-0.5">Common Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            onClick={() => setSearchQuery('Booking')}
            className="cursor-pointer border border-hairline p-4 rounded-xl hover:border-accent transition bg-white shadow-card flex items-start gap-3"
          >
            <CalendarClock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-ink">Booking Issues</h4>
              <p className="text-xs text-muted mt-1 leading-normal">Reschedule, Cancel, & manage booking flows.</p>
            </div>
          </Card>

          <Card
            onClick={() => setSearchQuery('Refund')}
            className="cursor-pointer border border-hairline p-4 rounded-xl hover:border-accent transition bg-white shadow-card flex items-start gap-3"
          >
            <CreditCard className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-ink">Payment & Refunds</h4>
              <p className="text-xs text-muted mt-1 leading-normal">Invoices, refund timing, & billing help.</p>
            </div>
          </Card>

          <Card
            onClick={() => setSearchQuery('vetting')}
            className="cursor-pointer border border-hairline p-4 rounded-xl hover:border-accent transition bg-white shadow-card flex items-start gap-3"
          >
            <ShieldAlert className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-ink">Trust & Safety</h4>
              <p className="text-xs text-muted mt-1 leading-normal">Vetting processes, coverage, & secure codes.</p>
            </div>
          </Card>

          <Card
            onClick={() => (window.location.href = '/reviews')}
            className="cursor-pointer border border-hairline p-4 rounded-xl hover:border-accent transition bg-white shadow-card flex items-start gap-3"
          >
            <ThumbsUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-ink">Provider Feedback</h4>
              <p className="text-xs text-muted mt-1 leading-normal">Leave reviews & rate your professionals.</p>
            </div>
          </Card>

          <Card
            onClick={() => (window.location.href = '/account')}
            className="cursor-pointer border border-hairline p-4 rounded-xl hover:border-accent transition bg-white shadow-card flex items-start gap-3"
          >
            <Settings className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-ink">Account Settings</h4>
              <p className="text-xs text-muted mt-1 leading-normal">Profile, addresses, payments, & privacy.</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider pl-0.5">Frequently Asked Questions</h2>
        {filteredFaqs.length === 0 ? (
          <p className="text-xs text-muted py-4 pl-0.5">No articles match your search.</p>
        ) : (
          <Card className="divide-y divide-hairline p-0 bg-white border border-hairline rounded-xl shadow-card overflow-hidden">
            {filteredFaqs.map((f) => (
              <details key={f.q} className="group px-5 py-4 transition hover:bg-bg/10">
                <summary className="cursor-pointer list-none text-sm font-bold text-ink flex items-center justify-between marker:hidden">
                  <span>{f.q}</span>
                  <span className="text-xs text-muted font-mono-utility font-normal group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="mt-2.5 text-xs sm:text-sm text-muted leading-relaxed">{f.a}</p>
              </details>
            ))}
          </Card>
        )}
      </section>

      {/* Still Stuck? Contact Support */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider pl-0.5">Still Need Help?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-hairline p-4 rounded-xl bg-white shadow-card text-center space-y-2">
            <MessageSquare className="h-5 w-5 text-accent mx-auto" />
            <h4 className="font-bold text-sm text-ink">Live Chat</h4>
            <p className="text-xs text-muted">Average wait time: 2 mins</p>
            <Button size="sm" className="w-full mt-2">
              Start Chat
            </Button>
          </Card>

          <Card className="border border-hairline p-4 rounded-xl bg-white shadow-card text-center space-y-2">
            <Mail className="h-5 w-5 text-accent mx-auto" />
            <h4 className="font-bold text-sm text-ink">Email Us</h4>
            <p className="text-xs text-muted">support@urbanassist.co.uk</p>
            <a href="mailto:support@urbanassist.co.uk" className="block w-full mt-2">
              <Button size="sm" variant="outline" className="w-full">
                Send Email
              </Button>
            </a>
          </Card>

          <Card className="border border-hairline p-4 rounded-xl bg-white shadow-card text-center space-y-2">
            <Phone className="h-5 w-5 text-accent mx-auto" />
            <h4 className="font-bold text-sm text-ink">Call Support</h4>
            <p className="text-xs text-muted">0800 123 456 (24/7 UK Freephone)</p>
            <a href="tel:0800123456" className="block w-full mt-2">
              <Button size="sm" variant="outline" className="w-full">
                Call Now
              </Button>
            </a>
          </Card>
        </div>
      </section>

      {/* Raise a Support Ticket Form */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider pl-0.5 font-display">Raise a Ticket</h2>
        <SupportForm />
      </section>

      {/* Existing Tickets list */}
      {!!tickets?.length && (
        <section className="space-y-3 pb-8">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider pl-0.5">Your Open Tickets</h2>
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li key={t.id}>
                <Card className="flex items-start justify-between gap-3 border border-hairline bg-white rounded-xl p-4 shadow-card">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink">{t.category}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed">{t.description}</p>
                    <div className="mt-2 text-[10px] text-muted font-mono-utility">
                      Raised {ukDateTime(t.created_at)}
                    </div>
                  </div>
                  <Badge tone={ticketTone[t.status] ?? 'muted'}>{t.status.replace(/_/g, ' ')}</Badge>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
