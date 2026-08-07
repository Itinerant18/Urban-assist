import * as React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Button, SuccessCheck } from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';
import { Calendar, MapPin, CreditCard, Receipt } from 'lucide-react';
import { StatusPill } from '../../../../components/status-pill';
import { StickyActionBar } from '../../../../components/sticky-action-bar';

export const dynamic = 'force-dynamic';

export default async function BookingSuccessPage({ searchParams }: { searchParams: { id?: string } }) {
  if (!searchParams.id) {
    redirect('/');
  }

  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: booking } = await db
    .from('bookings')
    .select('*, category:service_categories(name), address:addresses(*)')
    .eq('id', searchParams.id)
    .eq('customer_id', user.id)
    .single();

  if (!booking) {
    notFound();
  }

  const payLabel =
    booking.payment_method === 'card' ? 'Paid by card (or pending card confirmation)' : 'Pay after service (cash)';

  return (
    <div className="space-y-6 py-6 pb-24 lg:pb-6 max-w-xl mx-auto text-center">
      <div className="flex justify-center">
        <SuccessCheck size={80} />
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-ink">
          Booking received
        </h1>
        <p className="text-sm text-muted">
          We&apos;re matching a verified professional for your slot. Track status and chat once
          someone is assigned.
        </p>
      </div>

      <Card className="animate-pop-in border border-hairline bg-white p-5 rounded-xl shadow-card text-left space-y-4">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <span className="font-mono-utility text-xs text-muted uppercase tracking-wider">
            Order ID: #{booking.short_code}
          </span>
          <StatusPill status={booking.status} />
        </div>

        <ul className="space-y-3.5 text-sm">
          <li className="flex items-start gap-3">
            <Receipt className="h-4.5 w-4.5 text-muted mt-0.5" />
            <div>
              <span className="text-muted block text-xs">Service</span>
              <span className="font-bold text-ink">{booking.category?.name ?? 'Home Service'}</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Calendar className="h-4.5 w-4.5 text-muted mt-0.5" />
            <div>
              <span className="text-muted block text-xs">Date & Time</span>
              <span className="font-bold text-ink">
                {ukDateTime(booking.scheduled_at)}
              </span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <MapPin className="h-4.5 w-4.5 text-muted mt-0.5" />
            <div>
              <span className="text-muted block text-xs">Address</span>
              <span className="font-bold text-ink">
                {[booking.address?.line1, booking.address?.city, booking.address?.postcode]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Receipt className="h-4.5 w-4.5 text-muted mt-0.5" />
            <div>
              <span className="text-muted block text-xs">Total</span>
              <span className="font-bold text-ink font-mono-utility">{pence(booking.total_pence)}</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CreditCard className="h-4.5 w-4.5 text-muted mt-0.5" />
            <div>
              <span className="text-muted block text-xs">Payment</span>
              <span className="font-bold text-ink">{payLabel}</span>
            </div>
          </li>
        </ul>
      </Card>

      <div className="hidden lg:flex gap-3 justify-center pt-2">
        <Link href={`/bookings/${booking.id}`}>
          <Button className="px-8">Track booking</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="px-8">
            Back to home
          </Button>
        </Link>
      </div>

      <StickyActionBar zClassName="z-50">
        <Link href={`/bookings/${booking.id}`} className="block w-full">
          <Button size="block" className="min-h-12">
            Track booking
          </Button>
        </Link>
      </StickyActionBar>
    </div>
  );
}
