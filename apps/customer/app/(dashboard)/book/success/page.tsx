import * as React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Button, Badge } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import { CheckCircle2, Calendar, MapPin, CreditCard, Receipt } from 'lucide-react';

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

  // Fetch the booking detail
  const { data: booking } = await db
    .from('bookings')
    .select('*, category:service_categories(name), address:addresses(*)')
    .eq('id', searchParams.id)
    .eq('customer_id', user.id)
    .single();

  if (!booking) {
    notFound();
  }

  return (
    <div className="space-y-6 py-6 pb-24 lg:pb-6 max-w-xl mx-auto text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success/10 border border-success/20">
          <CheckCircle2 className="h-10 w-10 text-success animate-pulse" />
        </div>
      </div>

      {/* Headings */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-ink">
          Booking Confirmed, {user.user_metadata?.full_name ?? 'Client'}!
        </h1>
        {/* Desktop Description */}
        <p className="hidden lg:block text-sm text-muted">
          Your provider is reviewing your request.
        </p>
        {/* Mobile Description */}
        <p className="lg:hidden text-sm text-muted">
          We've emailed your receipt.
        </p>
      </div>

      {/* Booking Details Card */}
      <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card text-left space-y-4">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <span className="font-mono-utility text-xs text-muted uppercase tracking-wider">
            Order ID: #{booking.short_code}
          </span>
          <Badge tone="success">Confirmed</Badge>
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
                {new Date(booking.scheduled_at).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
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
              <span className="font-bold text-ink">{pence(booking.total_pence)}</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CreditCard className="h-4.5 w-4.5 text-muted mt-0.5" />
            <div>
              <span className="text-muted block text-xs">Payment</span>
              <span className="font-bold text-ink">
                {booking.payment_method === 'card' ? 'Card' : 'Cash'}
              </span>
            </div>
          </li>
        </ul>
      </Card>

      {/* DESKTOP ACTIONS */}
      <div className="hidden lg:flex gap-3 justify-center pt-2">
        <Link href={`/bookings/${booking.id}`}>
          <Button className="px-8">MANAGE BOOKING</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="px-8">
            RETURN TO HOME
          </Button>
        </Link>
      </div>

      {/* MOBILE STICKY BOTTOM CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <Link href="/bookings" className="block w-full">
          <Button size="block">VIEW MY BOOKINGS</Button>
        </Link>
      </div>
    </div>
  );
}
