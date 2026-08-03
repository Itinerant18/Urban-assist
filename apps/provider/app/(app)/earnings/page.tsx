'use client';
import * as React from 'react';
import { Card, Button } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { pence, ukDate } from '@urban-assist/lib';
import { Printer } from 'lucide-react';
import { buildWeeklyEarnings, weeklyWindow } from '../../../lib/weekly-earnings';

interface Transaction {
  id: string;
  type: 'booking' | 'payout';
  title: string;
  date: string;
  amount_pence: number;
  status: string;
  method?: string;
  short_code?: string;
}

export default function EarningsPage() {
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<any>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [stripeBusy, setStripeBusy] = React.useState(false);
  const [stripeError, setStripeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        const { data: p } = await sb.from('profiles').select('*').eq('id', user.id).single();
        setProfile(p);

        const { data: bookings } = await sb
          .from('bookings')
          .select('id, short_code, completed_at, created_at, price_pence, payment_method, category:service_categories(name)')
          .eq('provider_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        const { data: payouts } = await sb
          .from('payouts')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        const list: Transaction[] = [];

        (bookings ?? []).forEach((b: any) => {
          list.push({
            id: b.id,
            type: 'booking',
            title: b.category?.name || 'Service',
            short_code: b.short_code,
            date: b.completed_at || b.created_at,
            amount_pence: b.price_pence,
            status: 'succeeded',
            method: b.payment_method,
          });
        });

        (payouts ?? []).forEach((po: any) => {
          list.push({
            id: po.id,
            type: 'payout',
            title: 'Stripe Payout',
            date: po.created_at,
            amount_pence: po.amount_pence,
            status: po.status,
          });
        });

        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(list);
      } catch (err) {
        console.error('Failed to load earnings data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Commission-net balance from the server — gross-minus-net was overstating it.
  const [balancePending, setBalancePending] = React.useState(0);
  React.useEffect(() => {
    fetch('/api/earnings/balance', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.balance_pence === 'number') setBalancePending(data.balance_pence);
      })
      .catch(() => {});
  }, []);

  async function requestInstantPayout() {
    if (balancePending <= 0) return;
    setStripeBusy(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/stripe/payout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountPence: balancePending }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Payout request failed');
      }
      window.location.reload();
    } catch (e: any) {
      setStripeError(e.message);
    } finally {
      setStripeBusy(false);
    }
  }
  
  // The onboard/dashboard routes existed with no caller, so providers could never
  // create the Stripe account that `hasStripe` gates payouts on.
  async function openStripeLink(path: 'onboard' | 'dashboard') {
    setStripeBusy(true);
    setStripeError(null);
    try {
      const res = await fetch(`/api/stripe/connect/${path}`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) throw new Error(j.error ?? 'Could not reach Stripe');
      window.location.href = j.url;
    } catch (e: any) {
      setStripeError(e.message);
      setStripeBusy(false);
    }
  }

  const hasStripe = !!profile?.stripe_account_id;

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-24 bg-hairline rounded-xl" />
        <div className="h-64 bg-hairline rounded-xl" />
      </div>
    );
  }

  const weeklyEarnings = buildWeeklyEarnings(
    transactions
      .filter((transaction) => transaction.type === 'booking')
      .map((transaction) => ({
        completed_at: transaction.date,
        price_pence: transaction.amount_pence,
      })),
  );
  const weekMax = Math.max(...weeklyEarnings.map((entry) => entry.amountPence));
  const { start: weekStart } = weeklyWindow();
  const recentJobs = transactions
    .filter(
      (transaction) =>
        transaction.type === 'booking' && new Date(transaction.date) >= weekStart,
    )
    .slice(0, 5);
  const recentPayouts = transactions.filter(t => t.type === 'payout').slice(0, 5);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] pb-20 md:pb-0 printable-container">
      <div className="flex-1 space-y-6 py-2 overflow-y-auto px-4 md:px-0">
        <header className="flex items-center justify-between no-print">
          <div>
            <h1 className="font-display text-2xl uppercase font-bold text-ink tracking-tight">Earnings & Payouts</h1>
          </div>
          <button onClick={() => window.print()} className="hidden md:flex items-center gap-1 text-xs text-muted hover:text-ink">
            <Printer className="h-4 w-4" /> Print
          </button>
        </header>

        {/* Balance Card */}
        <Card className="flex flex-col md:flex-row md:items-center justify-between !p-6 bg-white border border-hairline shadow-card">
          <div className="space-y-4 md:space-y-0 md:flex md:gap-12">
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Available Balance</p>
              <div className="font-display text-4xl font-bold mt-1 text-ink">{pence(balancePending)}</div>
            </div>
          </div>
          
          <div className="mt-6 md:mt-0 hidden md:flex md:flex-col md:items-end md:gap-2">
            {hasStripe ? (
              <>
                <Button onClick={requestInstantPayout} disabled={stripeBusy || balancePending <= 0}>
                  {stripeBusy ? 'Processing...' : 'Withdraw to Bank'}
                </Button>
                <button
                  onClick={() => openStripeLink('dashboard')}
                  disabled={stripeBusy}
                  className="tap text-xs text-muted underline hover:text-ink disabled:opacity-50"
                >
                  View Stripe dashboard
                </button>
              </>
            ) : (
              <>
                {/* Was dead copy pointing at a Settings screen that had no such control. */}
                <Button onClick={() => openStripeLink('onboard')} disabled={stripeBusy}>
                  {stripeBusy ? 'Opening Stripe...' : 'Set up payouts'}
                </Button>
                <p className="text-xs text-muted max-w-[200px] text-right">
                  Connect a bank account to withdraw your earnings.
                </p>
              </>
            )}
          </div>
        </Card>
        {stripeError && <p className="text-xs text-danger">{stripeError}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Earnings History Chart */}
            <section className="space-y-3">
               <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Earnings History (Last 7 Days)</h2>
               <Card className="!p-6 flex flex-col justify-end h-48 bg-bg/30">
                  <div className="flex items-end gap-4 h-full border-b border-hairline pb-2">
                     <div className="flex flex-col justify-between h-full text-[10px] text-muted font-mono-utility pr-2">
                       <span>{pence(weekMax)}</span>
                       <span>{pence(Math.round(weekMax / 2))}</span>
                       <span>{pence(0)}</span>
                     </div>
                     <div className="flex-1 flex items-end justify-around h-full">
                       {weeklyEarnings.map((entry) => (
                         <div key={entry.date} className="w-12 bg-accent rounded-t-sm transition-all duration-500 hover:bg-ink" style={{ height: `${entry.heightPercent}%` }}></div>
                       ))}
                     </div>
                  </div>
                  <div className="flex pl-10 mt-2 justify-around text-[10px] text-muted font-mono-utility">
                     {weeklyEarnings.map((entry) => (
                       <span key={entry.date}>{entry.day}</span>
                     ))}
                  </div>
               </Card>
            </section>

            {/* Completed Jobs */}
            <section className="space-y-3">
               <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Completed Jobs (This Week)</h2>
               <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden">
                 {recentJobs.length === 0 ? (
                    <div className="p-4 text-sm text-muted text-center">No completed jobs this week.</div>
                 ) : (
                   <ul className="divide-y divide-hairline">
                     {recentJobs.map(job => (
                       <li key={job.id} className="p-4 flex items-center justify-between hover:bg-bg/40">
                         <div>
                            <div className="font-bold text-sm text-ink flex items-center gap-2">
                               {ukDate(job.date)} <span className="text-hairline">•</span> {job.title}
                            </div>
                            <div className="text-xs text-muted font-mono-utility mt-1">Booking: #{job.short_code}</div>
                         </div>
                         <div className="font-mono-utility text-success font-medium">
                           +{pence(job.amount_pence)}
                         </div>
                       </li>
                     ))}
                   </ul>
                 )}
               </div>
            </section>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <section className="space-y-3">
               <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Recent Payouts</h2>
               <div className="bg-white rounded-xl border border-hairline shadow-card overflow-hidden p-4">
                 {recentPayouts.length === 0 ? (
                    <div className="text-sm text-muted">No payouts yet.</div>
                 ) : (
                   <ul className="space-y-3">
                     {recentPayouts.map(payout => (
                       <li key={payout.id} className="flex items-center justify-between text-sm">
                         <span className="text-muted">{ukDate(payout.date)}:</span>
                         <span className="font-mono-utility font-medium">{pence(payout.amount_pence)}</span>
                       </li>
                     ))}
                   </ul>
                 )}
               </div>
            </section>
          </div>
        </div>

      </div>

      {/* Sticky Bottom CTA for Mobile */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-hairline z-20">
         {hasStripe ? (
           <Button
              className="w-full shadow-lg"
              onClick={requestInstantPayout}
              disabled={stripeBusy || balancePending <= 0}
            >
              {stripeBusy ? 'Processing...' : 'Withdraw to Bank'}
           </Button>
         ) : (
           <Button
              className="w-full shadow-lg"
              onClick={() => openStripeLink('onboard')}
              disabled={stripeBusy}
            >
              {stripeBusy ? 'Opening Stripe...' : 'Set up payouts'}
           </Button>
         )}
      </div>
    </div>
  );
}
