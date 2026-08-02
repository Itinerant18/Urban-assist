'use client';
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Field, Input, Textarea, Badge, RatingStars } from '@urban-assist/ui';
import { pence, quote } from '@urban-assist/lib';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { CreditCard, Banknote, MapPin, Plus, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { AddressForm } from '../../../../components/address-form';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  is_default: boolean;
}

interface Service {
  id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  provider: { id: string; full_name: string; avatar_url: string | null; rating_avg: number; kyc_status: string };
  category: { name: string; slug: string };
}

const CheckoutSchema = z.object({
  addressId: z.string().min(1, 'Please select or add an address'),
  scheduledAt: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.getTime() > Date.now();
  }, 'Schedule time must be in the future'),
  paymentMethod: z.enum(['card', 'cash']),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable(),
  promoCode: z.string().optional().nullable(),
});

type CheckoutFormValues = z.infer<typeof CheckoutSchema>;

export function BookFlow({ service, addresses: initialAddresses, walletBalance = 0 }: { service: Service; addresses: Address[]; walletBalance?: number }) {
  const router = useRouter();
  const [addresses, setAddresses] = React.useState<Address[]>(initialAddresses);
  const [applyWallet, setApplyWallet] = React.useState(false);
  
  // Accordion active step on mobile: 'address' | 'schedule' | 'payment'
  const [activeStep, setActiveStep] = React.useState<'address' | 'schedule' | 'payment'>('address');
  const [adding, setAdding] = React.useState(addresses.length === 0);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = React.useState<{ type: 'percent' | 'fixed'; value: number } | null>(null);

  // Form setup
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      addressId: addresses.find(a => a.is_default)?.id || addresses[0]?.id || '',
      scheduledAt: defaultSlot(),
      paymentMethod: 'card',
      notes: '',
      promoCode: '',
    },
  });

  const selectedAddressId = watch('addressId');
  const selectedPaymentMethod = watch('paymentMethod');
  const selectedDate = watch('scheduledAt');
  const promoCodeValue = watch('promoCode');

  // Stripe checkout states
  const [paymentSecret, setPaymentSecret] = React.useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = React.useState<string | null>(null);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [payBusy, setPayBusy] = React.useState(false);
  const [stripeElements, setStripeElements] = React.useState<any>(null);
  const [cardElementRef, setCardElementRef] = React.useState<any>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  // Fetch promo details if valid
  const applyPromo = async () => {
    if (!promoCodeValue) return;
    setPromoError(null);
    try {
      const sb = supabase();
      const { data, error } = await sb
        .from('promo_codes')
        .select('discount_type, discount_value, expires_at')
        .eq('code', promoCodeValue.toUpperCase())
        .single();
      if (error || !data) {
        setPromoError('Invalid promo code');
        setPromoDiscount(null);
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError('Promo code has expired');
        setPromoDiscount(null);
        return;
      }
      setPromoDiscount({
        type: data.discount_type as 'percent' | 'fixed',
        value: data.discount_value,
      });
    } catch {
      setPromoError('Error verifying promo code');
    }
  };

  // Re-calculate pricing quote
  const q = React.useMemo(() => {
    const promoObj = promoDiscount ? {
      id: 'promo-active',
      discount_type: promoDiscount.type,
      discount_value: promoDiscount.value,
    } : null;
    return quote(service.price_pence, promoObj);
  }, [service.price_pence, promoDiscount]);

  React.useEffect(() => {
    if (!paymentSecret) return;
    let active = true;

    async function initStripe() {
      const stripe = await stripePromise;
      if (!stripe || !active) return;

      const elements = stripe.elements();
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '15px',
            color: '#1C2024',
            fontFamily: 'Inter, system-ui, sans-serif',
            '::placeholder': { color: '#8B8D91' },
          },
        },
      });
      card.mount('#card-element');
      setStripeElements(stripe);
      setCardElementRef(card);
    }
    initStripe();

    return () => {
      active = false;
    };
  }, [paymentSecret]);

  async function confirmPayment() {
    if (!stripeElements || !cardElementRef || !paymentSecret || !createdBookingId) return;
    setPayBusy(true);
    setPayError(null);
    try {
      const { paymentIntent, error: payErr } = await stripeElements.confirmCardPayment(paymentSecret, {
        payment_method: {
          card: cardElementRef,
        },
      });
      if (payErr) {
        throw new Error(payErr.message ?? 'Payment failed');
      }
      if (paymentIntent?.status === 'succeeded') {
        router.replace(`/book/success?id=${createdBookingId}`);
      } else {
        throw new Error('Payment was not completed successfully.');
      }
    } catch (e: any) {
      setPayError(e.message);
    } finally {
      setPayBusy(false);
    }
  }

  async function onCheckoutSubmit(values: CheckoutFormValues) {
    setBookingError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider_service_id: service.id,
          address_id: values.addressId,
          scheduled_at: new Date(values.scheduledAt).toISOString(),
          payment_method: values.paymentMethod,
          promo_code: promoDiscount ? values.promoCode : null,
          apply_wallet: applyWallet && walletBalance > 0,
          notes: values.notes || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not create booking');
      }
      const data = await res.json();
      if (values.paymentMethod === 'card' && data.payment?.client_secret) {
        setPaymentSecret(data.payment.client_secret);
        setCreatedBookingId(data.booking.id);
      } else {
        router.replace(`/book/success?id=${data.booking.id}`);
      }
    } catch (e: any) {
      setBookingError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleAddNewAddress = (newAddrId: string) => {
    const sb = supabase();
    sb.from('addresses').select('*').eq('id', newAddrId).single().then(({ data }) => {
      if (data) {
        const mapped: Address = {
          id: data.id,
          label: data.label,
          line1: data.line1,
          line2: data.line2,
          city: data.city,
          postcode: data.postcode,
          is_default: data.is_default || false,
        };
        setAddresses((prev) => [...prev, mapped]);
        setValue('addressId', mapped.id);
        setAdding(false);
      }
    });
  };

  const getAddressText = () => {
    const addr = addresses.find(a => a.id === selectedAddressId);
    if (!addr) return 'No address selected';
    return `${addr.label} (${[addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(', ')})`;
  };

  const getScheduleText = () => {
    if (!selectedDate) return 'No date selected';
    return new Date(selectedDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getPaymentText = () => {
    return selectedPaymentMethod === 'card' ? 'Credit/Debit Card' : 'Pay in Cash';
  };

  return (
    <div className="mx-auto max-w-6xl py-4 pb-28 lg:py-6 lg:pb-0">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Secure Checkout</h1>
        <p className="text-sm text-muted mt-1">Review your service details, choose an address, and confirm your scheduling.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px] lg:items-start">
        {/* Left Side: Form Sections */}
        <div className="space-y-4">
          <Card className="p-4 border border-hairline bg-white shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-hairline">
                {service.provider.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={service.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink text-sm lg:text-base">{service.provider.full_name}</span>
                  {service.provider.kyc_status === 'approved' && <Badge tone="success">Verified</Badge>}
                </div>
                <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                  <RatingStars value={Number(service.provider.rating_avg ?? 0)} />
                  <span>·</span>
                  <span>{service.category.name}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Estimated Duration</div>
              <div className="font-medium text-sm text-ink">{service.duration_mins} mins</div>
            </div>
          </Card>

          <form onSubmit={handleSubmit(onCheckoutSubmit)} className="space-y-4">
            {/* --- 1. Address Section --- */}
            <div className="border border-hairline rounded-2xl overflow-hidden bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setActiveStep('address')}
                className="w-full flex items-center justify-between p-4 bg-bg/40 hover:bg-bg/70 transition text-left border-b border-hairline"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-bg">1</span>
                  <div>
                    <h3 className="font-bold text-ink text-sm">Service Address</h3>
                    <p className="text-xs text-muted mt-0.5 lg:hidden">{getAddressText()}</p>
                  </div>
                </div>
                {activeStep === 'address' ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </button>

              <div className={`${activeStep === 'address' ? 'block' : 'hidden lg:block'} p-4 space-y-4`}>
                <Controller
                  control={control}
                  name="addressId"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {addresses.length > 0 && !adding && (
                        <div className="grid gap-2">
                          {addresses.map((a) => (
                            <label
                              key={a.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${field.value === a.id ? 'border-ink bg-accent/5' : 'border-hairline hover:bg-bg/25'}`}
                            >
                              <input
                                type="radio"
                                checked={field.value === a.id}
                                onChange={() => field.onChange(a.id)}
                                className="mt-1 accent-ink"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 font-bold text-sm text-ink">
                                  <MapPin className="h-3.5 w-3.5 text-muted" />
                                  {a.label}
                                  {a.is_default && <span className="font-normal text-xs text-muted ml-1">(Default)</span>}
                                </div>
                                <div className="text-xs text-muted mt-1 leading-normal">
                                  {[a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(', ')}
                                </div>
                              </div>
                            </label>
                          ))}
                          <button
                            type="button"
                            onClick={() => setAdding(true)}
                            className="flex items-center gap-2 text-xs font-medium text-accent hover:text-accent/80 w-fit mt-1"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add a new address
                          </button>
                        </div>
                      )}

                      {(adding || addresses.length === 0) && (
                        <div className="border border-dashed border-hairline p-4 rounded-xl">
                          <AddressForm
                            onAdded={handleAddNewAddress}
                            onCancel={addresses.length ? () => setAdding(false) : undefined}
                          />
                        </div>
                      )}
                      {errors.addressId && <p className="text-xs text-danger mt-1">{errors.addressId.message}</p>}
                    </div>
                  )}
                />
              </div>
            </div>

            {/* --- 2. Schedule Section --- */}
            <div className="border border-hairline rounded-2xl overflow-hidden bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setActiveStep('schedule')}
                className="w-full flex items-center justify-between p-4 bg-bg/40 hover:bg-bg/70 transition text-left border-b border-hairline"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-bg">2</span>
                  <div>
                    <h3 className="font-bold text-ink text-sm">Schedule Booking</h3>
                    <p className="text-xs text-muted mt-0.5 lg:hidden">{getScheduleText()}</p>
                  </div>
                </div>
                {activeStep === 'schedule' ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </button>

              <div className={`${activeStep === 'schedule' ? 'block' : 'hidden lg:block'} p-4 space-y-4`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <Field label="Service Date & Time" error={errors.scheduledAt?.message}>
                        <Input
                          type="datetime-local"
                          value={field.value}
                          min={isoNow()}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    control={control}
                    name="notes"
                    render={({ field }) => (
                      <Field label="Instructions/Notes for Provider (optional)">
                        <Textarea
                          placeholder="e.g. key box code, gate entry instructions, parking availability"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value.slice(0, 500))}
                          rows={3}
                          maxLength={500}
                        />
                        <p className="mt-1 text-right text-xs text-muted">
                          {(field.value || '').length}/500
                        </p>
                      </Field>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* --- 3. Payment Method Section --- */}
            <div className="border border-hairline rounded-2xl overflow-hidden bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setActiveStep('payment')}
                className="w-full flex items-center justify-between p-4 bg-bg/40 hover:bg-bg/70 transition text-left border-b border-hairline"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-bg">3</span>
                  <div>
                    <h3 className="font-bold text-ink text-sm">Payment Method</h3>
                    <p className="text-xs text-muted mt-0.5 lg:hidden">{getPaymentText()}</p>
                  </div>
                </div>
                {activeStep === 'payment' ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
              </button>

              <div className={`${activeStep === 'payment' ? 'block' : 'hidden lg:block'} p-4 space-y-4`}>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label
                          className={`flex flex-col items-start gap-1 cursor-pointer rounded-xl border p-4 transition-colors ${field.value === 'card' ? 'border-ink bg-accent/5' : 'border-hairline hover:bg-bg/25'}`}
                        >
                          <div className="flex items-center gap-2 font-bold text-sm text-ink">
                            <input
                              type="radio"
                              name="payMethod"
                              checked={field.value === 'card'}
                              onChange={() => field.onChange('card')}
                              className="accent-ink"
                            />
                            <CreditCard className="h-4 w-4 text-muted" />
                            Credit/Debit Card
                          </div>
                          <span className="text-xs text-muted ml-5">Processed securely by Stripe</span>
                        </label>

                        <label
                          className={`flex flex-col items-start gap-1 cursor-pointer rounded-xl border p-4 transition-colors ${field.value === 'cash' ? 'border-ink bg-accent/5' : 'border-hairline hover:bg-bg/25'}`}
                        >
                          <div className="flex items-center gap-2 font-bold text-sm text-ink">
                            <input
                              type="radio"
                              name="payMethod"
                              checked={field.value === 'cash'}
                              onChange={() => field.onChange('cash')}
                              className="accent-ink"
                            />
                            <Banknote className="h-4 w-4 text-muted" />
                            Cash on Completion
                          </div>
                          <span className="text-xs text-muted ml-5">Pay provider directly after the job</span>
                        </label>
                      </div>

                      {field.value === 'card' && paymentSecret && (
                        <div className="border border-hairline rounded-xl p-4 bg-bg/50 mt-4 space-y-3">
                          <span className="font-mono-utility text-xs text-muted block">Secure Card Input</span>
                          <div id="card-element" className="p-3.5 bg-white border border-hairline rounded-xl shadow-inner" />
                          {payError && <p className="text-xs text-danger font-medium mt-1">{payError}</p>}
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            {bookingError && <p className="text-sm text-danger font-medium text-center">{bookingError}</p>}
            
            {/* Desktop form submit button */}
            <div className="hidden lg:block">
              {selectedPaymentMethod === 'card' && paymentSecret ? (
                <Button type="button" onClick={confirmPayment} size="block" disabled={payBusy}>
                  {payBusy ? 'Processing Payment…' : `Complete Card Payment ${pence(q.total_pence)}`}
                </Button>
              ) : (
                <Button type="submit" size="block" disabled={submitting || !selectedAddressId}>
                  {submitting ? 'Booking…' : `Confirm & Place Booking ${pence(q.total_pence)}`}
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Sticky Checkout / Summary card (Desktop Only) */}
        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <Card className="border border-hairline bg-white shadow-sm p-4 space-y-4">
            <h3 className="font-display font-bold text-lg text-ink border-b border-hairline pb-2">Order Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Standard Rate ({service.title})</span>
                <span className="font-medium text-ink">{pence(q.net_pence)}</span>
              </div>
              {q.discount_pence > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount Code Applied</span>
                  <span>-{pence(q.discount_pence)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">VAT (20%)</span>
                <span className="font-medium text-ink">{pence(q.vat_pence)}</span>
              </div>
              <div className="border-t border-hairline pt-3 flex justify-between items-baseline">
                <span className="font-bold text-ink text-base">Total Price</span>
                <span className="font-display font-extrabold text-2xl text-ink">{pence(q.total_pence)}</span>
              </div>
              <p className="text-[10px] text-muted text-right">VAT Included · GBP</p>
            </div>

            {/* Promo Code section */}
            <div className="pt-3 border-t border-hairline space-y-2">
              <label className="text-xs font-bold text-ink block">Promo Code</label>
              <div className="flex gap-2">
                <Controller
                  control={control}
                  name="promoCode"
                  render={({ field }) => (
                    <Input
                      placeholder="e.g. SAVE10"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="flex-1 uppercase font-mono-utility text-xs"
                      disabled={!!promoDiscount}
                    />
                  )}
                />
                {promoDiscount ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPromoDiscount(null);
                      setValue('promoCode', '');
                    }}
                  >
                    Clear
                  </Button>
                ) : (
                  <Button type="button" onClick={applyPromo} disabled={!promoCodeValue}>
                    Apply
                  </Button>
                )}
              </div>
              {promoError && <p className="text-[11px] text-danger mt-1 font-medium">{promoError}</p>}
              {promoDiscount && <p className="text-[11px] text-success mt-1 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Promo applied successfully!</p>}
              {walletBalance > 0 && (
                <label className="mt-3 flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyWallet}
                    onChange={(e) => setApplyWallet(e.target.checked)}
                    className="h-4 w-4 rounded border-hairline"
                  />
                  Apply wallet credit (£{(walletBalance / 100).toFixed(2)} available)
                </label>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* Sticky Bottom CTA for Mobile Checkout */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden flex flex-col gap-2">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-muted uppercase tracking-wider font-mono-utility">Total (Inc. VAT)</div>
            <div className="text-xl font-extrabold leading-tight text-ink">{pence(q.total_pence)}</div>
          </div>
          
          {selectedPaymentMethod === 'card' && paymentSecret ? (
            <Button
              type="button"
              onClick={confirmPayment}
              disabled={payBusy}
              className="px-6"
            >
              {payBusy ? 'Processing…' : 'Pay Card'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                // If on mobile, submit by programmatically triggering submit on checkout form
                handleSubmit(onCheckoutSubmit)();
              }}
              disabled={submitting || !selectedAddressId}
              className="px-6"
            >
              {submitting ? 'Booking…' : 'Place Booking'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function defaultSlot() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}
function isoNow() {
  return new Date().toISOString().slice(0, 16);
}
