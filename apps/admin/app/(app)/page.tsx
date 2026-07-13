import { getSupabaseServer } from '@urban-assist/db/server';
import { Briefcase, Users, ShieldCheck, TicketCheck, AlertTriangle, ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import { Card, Button, Badge } from '@urban-assist/ui';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  hint?: string;
}

function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4 border border-hairline bg-white rounded-xl shadow-card p-4">
      <div className="rounded-lg bg-accent/10 p-2.5 shrink-0">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-xs text-muted font-mono-utility mb-0.5">{label}</p>
        <p className="text-2xl font-display font-bold text-ink">{value}</p>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const db = getSupabaseServer();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Parallel database fetches for platform live data
  const [bookingsRes, providersRes, kycRes, ticketsRes, pendingKycUsers, urgentRes, activeJobsRes, paymentsTodayRes] = await Promise.all([
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending_match'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider').eq('is_online', true),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider').eq('kyc_status', 'pending'),
    db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('profiles').select('id, full_name, kyc_status, created_at').eq('role', 'provider').eq('kyc_status', 'pending').limit(5),
    db
      .from('support_tickets')
      .select('id, category, description, created_at, raiser:profiles(full_name), booking:bookings(short_code)')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(3),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['assigned', 'on_the_way', 'arrived', 'in_progress']),
    db.from('payments').select('amount_pence').eq('status', 'succeeded').gte('created_at', todayStart.toISOString()),
  ]);

  const urgentTickets: any[] = urgentRes.data ?? [];
  const processedTodayPence = (paymentsTodayRes.data ?? []).reduce(
    (sum: number, p: any) => sum + (p.amount_pence ?? 0),
    0,
  );

  // Real document types for the pending-KYC providers (provider_documents.doc_type).
  const pendingIds = pendingKycUsers.data?.map((u: any) => u.id) ?? [];
  const { data: pendingDocs } = pendingIds.length
    ? await db.from('provider_documents').select('provider_id, doc_type').in('provider_id', pendingIds)
    : { data: [] as any[] };
  const docTypesByProvider: Record<string, string[]> = {};
  for (const d of pendingDocs ?? []) {
    (docTypesByProvider[d.provider_id] ??= []).push(d.doc_type);
  }

  const stats = [
    {
      label: 'Pending Bookings',
      value: bookingsRes.count ?? 0,
      icon: Briefcase,
      hint: 'Awaiting provider assignment',
    },
    {
      label: 'Providers Online',
      value: providersRes.count ?? 0,
      icon: Users,
      hint: 'Currently available',
    },
    {
      label: 'KYC Pending',
      value: kycRes.count ?? 0,
      icon: ShieldCheck,
      hint: 'Awaiting review',
    },
    {
      label: 'Open Tickets',
      value: ticketsRes.count ?? 0,
      icon: TicketCheck,
      hint: 'Support tickets open',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Platform overview — live operations.</p>
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* System Overview summary bar */}
      <div className="flex flex-wrap gap-3 bg-bg border border-hairline p-4 rounded-xl items-center justify-between shadow-sm">
        <div className="flex gap-4 text-xs font-semibold text-charcoal">
          <span>Active Jobs: <strong className="text-ink">{activeJobsRes.count ?? 0}</strong></span>
          <span>Processed Today: <strong className="text-ink">£{(processedTodayPence / 100).toFixed(2)}</strong></span>
        </div>
        <Badge tone="success">Operational</Badge>
      </div>

      {/* Urgent Ticket section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider pl-0.5">Needs Attention (Urgent)</h2>
        {urgentTickets.length === 0 ? (
          <Card className="border border-hairline bg-white p-6 rounded-xl shadow-card text-center text-xs text-muted">
            No urgent tickets.
          </Card>
        ) : (
          urgentTickets.map((t) => (
            <Card
              key={t.id}
              className="border border-accent bg-accent/5 p-4 rounded-xl shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-accent shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-ink">
                      Ticket #{t.id.slice(0, 8)} — {t.category}
                    </h4>
                    <Badge tone="danger">Open</Badge>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Raised by: {t.raiser?.full_name ?? 'Unknown'}
                    {t.booking?.short_code ? ` | Booking Reference: #${t.booking.short_code}` : ''}
                  </p>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <Link href="/tickets" className="hidden md:block">
                  <Button size="sm" variant="outline">
                    VIEW DETAILS
                  </Button>
                </Link>
                <Link href="/tickets" className="block md:hidden">
                  <Button size="sm" variant="outline" className="w-full">
                    RESOLVE
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </section>

      {/* KYC queue list */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-muted uppercase tracking-wider pl-0.5">
          Pending KYC Approvals ({kycRes.count ?? 0})
        </h2>

        {/* DESKTOP VIEW: Table grid */}
        <div className="hidden md:block border border-hairline rounded-xl overflow-hidden bg-white shadow-card">
          <table className="w-full text-left text-sm text-ink border-collapse">
            <thead>
              <tr className="bg-bg/40 border-b border-hairline font-mono-utility text-xs text-muted uppercase tracking-wider">
                <th className="p-4 font-bold">Name</th>
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Type</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {pendingKycUsers.data?.length ? (
                pendingKycUsers.data.map((u) => (
                  <tr key={u.id} className="hover:bg-bg/10 transition-colors">
                    <td className="p-4 font-bold">{u.full_name ?? 'Provider'}</td>
                    <td className="p-4 text-xs text-muted whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-4">{docTypesByProvider[u.id]?.join(', ') ?? '—'}</td>
                    <td className="p-4">
                      <Badge tone="accent">Awaiting Review</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/kyc`}>
                        <Button size="sm" variant="outline">
                          REVIEW
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-muted">
                    No pending KYC requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW: Collapsed High-Priority List */}
        <ul className="md:hidden space-y-3">
          {pendingKycUsers.data?.length ? (
            pendingKycUsers.data.map((u) => (
              <li key={u.id}>
                <Card className="border border-hairline bg-white p-4 rounded-xl shadow-card flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-ink">{u.full_name ?? 'Provider'}</h4>
                    <span className="text-xs text-muted mt-0.5 block">
                      {docTypesByProvider[u.id]?.join(', ') ?? '—'} ·{' '}
                      {new Date(u.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <Link href={`/kyc`}>
                    <Button size="sm" variant="outline">
                      REVIEW DOC
                    </Button>
                  </Link>
                </Card>
              </li>
            ))
          ) : (
            <li className="text-center py-6 text-xs text-muted">
              No pending KYC requests.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
