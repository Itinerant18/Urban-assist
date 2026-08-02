'use client';
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Field, Input, Textarea, Badge, RatingStars } from '@urban-assist/ui';
import { pence, quote } from '@urban-assist/lib';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { CreditCard, Banknote, MapPin, Plus, CheckCircle2, ChevronLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { AddressForm } from '../../../../components/address-form';
import { StickyActionBar, StickyActionMeta } from '../../../../components/sticky-action-bar';
import {
  defaultFutureSlot,
  dateKeyFromScheduledAt,
  formatSlotSummary,
  listBookingDays,
  listSlotsForDay,
} from '../../../../lib/booking-slots';

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
  }, 'Choose a future date and time window'),
  paymentMethod: z.enum(['card', 'cash']),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable(),
  promoCode: z.string().optional().nullable(),
  preferPrevious: z.boolean().optional(),
});

type CheckoutFormValues = z.infer<typeof CheckoutSchema>;
type WizardStep = 'address' | 'schedule' | 'confirm';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'address', label: 'Address' },
  { id: 'schedule', label: 'Date & time' },
  { id: 'confirm', label: 'Confirm & pay' },
];

type PreviousProvider = { id: string; full_name: string };

export function BookFlow({
  service,
  addresses: initialAddresses,
  walletBalance = 0,
  previousProvider = null,
}: {
  service: Service;
  addresses: Address[];
  walletBalance?: number;
  previousProvider?: PreviousProvider | null;
}) {
  const router = useRouter();
  const [addresses, setAddresses] = React.useState<Address[]>(initialAddresses);
  const [applyWallet, setApplyWallet] = React.useState(false);
  const [step, setStep] = React.useState<WizardStep>('address');
  const [adding, setAdding] = React.useState(addresses.length === 0);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = React.useState<{ type: 'percent' | 'fixed'; value: number } | null>(null);
  const [stepError, setStepError] = React.useState<string | null>(null);

  const days = React.useMemo(() => listBookingDays(), []);

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      addressId: addresses.find((a) => a.is_default)?.id || addresses[0]?.id || '',
      scheduledAt: defaultFutureSlot(),
      paymentMethod: 'card',
      notes: '',
      promoCode: '',
      preferPrevious: Boolean(previousProvider),
    },
  });

  const selectedAddressId = watch('addressId');
  const selectedPaymentMethod = watch('paymentMethod');
  const selectedDate = watch('scheduledAt');
  const promoCodeValue = watch('promoCode');
  const selectedDayKey = dateKeyFromScheduledAt(selectedDate || defaultFutureSlot());
  const slots = React.useMemo(() => listSlotsForDay(selectedDayKey), [selectedDayKey]);

  const [paymentSecret, setPaymentSecret] = React.useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = React.useState<string | null>(null);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [payBusy, setPayBusy] = React.useState(false);
  const [stripeElements, setStripeElements] = React.useState<any>(null);
  const [cardElementRef, setCardElementRef] = React.useState<any>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

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

  const q = React.useMemo(() => {
    const promoObj = promoDiscount
      ? {
          id: 'promo-active',
          discount_type: promoDiscount.type,
          discount_value: promoDiscount.value,
        }
      : null;
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
            color: '#2B2B28',
            fontFamily: 'Inter, system-ui, sans-serif',
            '::placeholder': { color: '#6B6A62' },
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
        payment_method: { card: cardElementRef },
      });
      if (payErr) throw new Error(payErr.message ?? 'Payment failed');
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
      const preferredProviderId =
        values.preferPrevious && previousProvider ? previousProvider.id : service.provider.id;

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
          preferred_provider_id: preferredProviderId,
        }),
      });
      if (res.status === 401) {
        const redirect = encodeURIComponent(
          typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/book',
        );
        router.push(`/login?redirect=${redirect}`);
        return;
      }
      if (res.status === 429) {
        throw new Error('Too many booking attempts. Please wait a moment and try again.');
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not create booking');
      }
      const data = await res.json();
      if (values.paymentMethod === 'card' && data.payment?.client_secret) {
        setPaymentSecret(data.payment.client_secret);
        setCreatedBookingId(data.booking.id);
        setStep('confirm');
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
    sb.from('addresses')
      .select('*')
      .eq('id', newAddrId)
      .single()
      .then(({ data }) => {
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

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function goNext() {
    setStepError(null);
    if (step === 'address') {
      const ok = await trigger('addressId');
      if (!ok || !selectedAddressId) {
        setStepError('Select or add a service address to continue.');
        return;
      }
      setStep('schedule');
      return;
    }
    if (step === 'schedule') {
      const ok = await trigger('scheduledAt');
      if (!ok) {
        setStepError(errors.scheduledAt?.message ?? 'Choose a date and time window.');
        return;
      }
      setStep('confirm');
    }
  }

  function goBack() {
    setStepError(null);
    if (step === 'schedule') setStep('address');
    if (step === 'confirm' && !paymentSecret) setStep('schedule');
  }

  const addrSummary = (() => {
    const addr = addresses.find((a) => a.id === selectedAddressId);
    if (!addr) return 'No address selected';
    return `${addr.label} · ${[addr.line1, addr.postcode].filter(Boolean).join(', ')}`;
  })();

  return (
    <div className="mx-auto max-w-6xl py-4 pb-36 lg:py-6 lg:pb-8">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink">Book {service.title}</h1>
        <p className="mt-1 text-sm text-muted">
          One step at a time. We&apos;ll match a verified professional after you confirm — preference is a soft
          request, not a guarantee.
        </p>
      </div>

      {/* Progress strip */}
      <ol className="mb-6 flex items-center gap-1 sm:gap-2" aria-label="Booking progress">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    current
                      ? 'bg-accent text-white'
                      : done
                        ? 'bg-ink text-bg'
                        : 'bg-hairline text-muted'
                  }`}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={`truncate text-[10px] font-semibold sm:text-[11px] ${
                    current ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mb-4 h-0.5 w-full max-w-[40px] sm:max-w-[64px] ${done ? 'bg-ink' : 'bg-hairline'}`} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px] lg:items-start">
        <div className="space-y-4">
          <Card className="flex items-center justify-between gap-4 border border-hairline bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-hairline">
                {service.provider.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={service.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{service.provider.full_name}</span>
                  {service.provider.kyc_status === 'approved' && <Badge tone="success">Verified</Badge>}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <RatingStars value={Number(service.provider.rating_avg ?? 0)} />
                  <span>·</span>
                  <span>{service.duration_mins} mins</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted">From</div>
              <div className="text-sm font-extrabold text-ink">{pence(service.price_pence)}</div>
            </div>
          </Card>

          <form onSubmit={handleSubmit(onCheckoutSubmit)} className="space-y-4">
            {step === 'address' && (
              <section className="space-y-4 rounded-2xl border border-hairline bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-ink">Where should we come?</h2>
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
                              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                                field.value === a.id
                                  ? 'border-accent bg-accent/5'
                                  : 'border-hairline hover:bg-bg/25'
                              }`}
                            >
                              <input
                                type="radio"
                                checked={field.value === a.id}
                                onChange={() => field.onChange(a.id)}
                                className="mt-1 accent-[var(--accent,#C1622E)]"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                                  <MapPin className="h-3.5 w-3.5 text-muted" />
                                  {a.label}
                                  {a.is_default && (
                                    <span className="ml-1 text-xs font-normal text-muted">(Default)</span>
                                  )}
                                </div>
                                <div className="mt-1 text-xs leading-normal text-muted">
                                  {[a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(', ')}
                                </div>
                              </div>
                            </label>
                          ))}
                          <button
                            type="button"
                            onClick={() => setAdding(true)}
                            className="mt-1 flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-accent"
                          >
                            <Plus className="h-4 w-4" /> Add a new address
                          </button>
                        </div>
                      )}
                      {(adding || addresses.length === 0) && (
                        <div className="rounded-xl border border-dashed border-hairline p-4">
                          <AddressForm
                            onAdded={handleAddNewAddress}
                            onCancel={addresses.length ? () => setAdding(false) : undefined}
                          />
                        </div>
                      )}
                      {errors.addressId && (
                        <p className="mt-1 text-xs text-danger">{errors.addressId.message}</p>
                      )}
                    </div>
                  )}
                />
              </section>
            )}

            {step === 'schedule' && (
              <section className="space-y-5 rounded-2xl border border-hairline bg-white p-4 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-ink">Pick a date &amp; window</h2>
                  <p className="mt-1 text-xs text-muted">
                    These are platform booking windows — not live diary slots. We match a verified pro after you
                    confirm.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Date</p>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
                    {days.map((day) => {
                      const selected = day.dateKey === selectedDayKey;
                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => {
                            const nextSlots = listSlotsForDay(day.dateKey);
                            const open = nextSlots.find((s) => !s.disabled) ?? nextSlots[0];
                            if (open) setValue('scheduledAt', open.value, { shouldValidate: true });
                          }}
                          className={`tap flex min-h-14 min-w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl border px-2 py-2 transition-colors ${
                            selected
                              ? 'border-accent bg-accent/10 text-ink'
                              : 'border-hairline bg-white text-muted'
                          }`}
                        >
                          <span className="text-[10px] font-semibold uppercase">{day.weekday}</span>
                          <span className="text-lg font-extrabold leading-none text-ink">{day.dayNum}</span>
                          <span className="text-[10px]">{day.monthShort}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Time window</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((slot) => {
                      const selected = selectedDate === slot.value;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          disabled={slot.disabled}
                          onClick={() => setValue('scheduledAt', slot.value, { shouldValidate: true })}
                          className={`tap min-h-12 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                            slot.disabled
                              ? 'cursor-not-allowed border-hairline bg-bg/50 text-muted/50 line-through'
                              : selected
                                ? 'border-accent bg-accent text-white'
                                : 'border-hairline bg-white text-ink hover:border-accent/40'
                          }`}
                        >
                          {slot.rangeLabel}
                        </button>
                      );
                    })}
                  </div>
                  {errors.scheduledAt && (
                    <p className="mt-2 text-xs text-danger">{errors.scheduledAt.message}</p>
                  )}
                </div>

                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <Field label="Notes for the professional (optional)">
                      <Textarea
                        placeholder="e.g. key box code, gate entry, parking"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value.slice(0, 500))}
                        rows={3}
                        maxLength={500}
                      />
                      <p className="mt-1 text-right text-xs text-muted">{(field.value || '').length}/500</p>
                    </Field>
                  )}
                />

                {previousProvider && (
                  <Controller
                    control={control}
                    name="preferPrevious"
                    render={({ field }) => (
                      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-bg/40 p-3.5">
                        <input
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-0.5 h-5 w-5 accent-[var(--accent,#C1622E)]"
                        />
                        <span className="text-sm text-ink">
                          <span className="font-medium">Prefer {previousProvider.full_name} from last time</span>
                          <span className="mt-0.5 block text-xs text-muted">
                            Soft request only — we&apos;ll try if they&apos;re available for this window.
                          </span>
                        </span>
                      </label>
                    )}
                  />
                )}
              </section>
            )}

            {step === 'confirm' && (
              <section className="space-y-4 rounded-2xl border border-hairline bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-ink">Confirm &amp; pay</h2>

                <div className="space-y-2 rounded-xl bg-bg/50 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Service</span>
                    <span className="text-right font-medium text-ink">{service.title}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Address</span>
                    <span className="text-right font-medium text-ink">{addrSummary}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">When</span>
                    <span className="text-right font-medium text-ink">{formatSlotSummary(selectedDate)}</span>
                  </div>
                </div>

                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</p>
                      <div className="grid gap-3">
                        <label
                          className={`flex min-h-14 cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors ${
                            field.value === 'card' ? 'border-accent bg-accent/5' : 'border-hairline'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm font-bold text-ink">
                            <input
                              type="radio"
                              name="payMethod"
                              checked={field.value === 'card'}
                              onChange={() => field.onChange('card')}
                              className="accent-[var(--accent,#C1622E)]"
                              disabled={Boolean(paymentSecret)}
                            />
                            <CreditCard className="h-4 w-4 text-muted" />
                            Pay now
                          </div>
                          <span className="ml-6 text-xs text-muted">
                            Card via Stripe — secures your booking window and reduces no-shows. Charged when you
                            confirm.
                          </span>
                        </label>

                        <label
                          className={`flex min-h-14 cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors ${
                            field.value === 'cash' ? 'border-accent bg-accent/5' : 'border-hairline'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm font-bold text-ink">
                            <input
                              type="radio"
                              name="payMethod"
                              checked={field.value === 'cash'}
                              onChange={() => field.onChange('cash')}
                              className="accent-[var(--accent,#C1622E)]"
                              disabled={Boolean(paymentSecret)}
                            />
                            <Banknote className="h-4 w-4 text-muted" />
                            Pay after service
                          </div>
                          <span className="ml-6 text-xs text-muted">
                            Cash to the professional after the job — confirm payment in-app when done. Invoice and
                            payment link may also be sent.
                          </span>
                        </label>
                      </div>

                      {field.value === 'card' && paymentSecret && (
                        <div className="mt-2 space-y-3 rounded-xl border border-hairline bg-bg/50 p-4">
                          <span className="block font-mono-utility text-xs text-muted">Secure card input</span>
                          <div
                            id="card-element"
                            className="rounded-xl border border-hairline bg-white p-3.5 shadow-inner"
                          />
                          {payError && <p className="text-xs font-medium text-danger">{payError}</p>}
                        </div>
                      )}
                    </div>
                  )}
                />

                <div className="space-y-2 border-t border-hairline pt-4 lg:hidden">
                  <label className="block text-xs font-bold text-ink">Promo code</label>
                  <div className="flex gap-2">
                    <Controller
                      control={control}
                      name="promoCode"
                      render={({ field }) => (
                        <Input
                          placeholder="e.g. SAVE10"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          className="flex-1 font-mono-utility text-xs uppercase"
                          disabled={!!promoDiscount || Boolean(paymentSecret)}
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
                        disabled={Boolean(paymentSecret)}
                      >
                        Clear
                      </Button>
                    ) : (
                      <Button type="button" onClick={applyPromo} disabled={!promoCodeValue}>
                        Apply
                      </Button>
                    )}
                  </div>
                  {promoError && <p className="text-[11px] font-medium text-danger">{promoError}</p>}
                  {promoDiscount && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" /> Promo applied
                    </p>
                  )}
                  {walletBalance > 0 && (
                    <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={applyWallet}
                        onChange={(e) => setApplyWallet(e.target.checked)}
                        className="h-4 w-4 rounded border-hairline"
                        disabled={Boolean(paymentSecret)}
                      />
                      Apply wallet credit (£{(walletBalance / 100).toFixed(2)} available)
                    </label>
                  )}
                </div>

                {bookingError && <p className="text-center text-sm font-medium text-danger">{bookingError}</p>}

                <div className="hidden lg:block">
                  {selectedPaymentMethod === 'card' && paymentSecret ? (
                    <Button type="button" onClick={confirmPayment} size="block" disabled={payBusy}>
                      {payBusy ? 'Processing payment…' : `Pay ${pence(q.total_pence)}`}
                    </Button>
                  ) : (
                    <Button type="submit" size="block" disabled={submitting || !selectedAddressId}>
                      {submitting ? 'Booking…' : `Confirm booking ${pence(q.total_pence)}`}
                    </Button>
                  )}
                </div>
              </section>
            )}

            {(stepError || (step === 'address' && errors.addressId)) && step !== 'confirm' && (
              <p className="text-center text-sm text-danger">{stepError}</p>
            )}
          </form>
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block lg:self-start">
          <Card className="space-y-4 border border-hairline bg-white p-4 shadow-sm">
            <h3 className="border-b border-hairline pb-2 font-display text-lg font-bold text-ink">
              Order summary
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">{service.title}</span>
                <span className="font-medium text-ink">{pence(q.net_pence)}</span>
              </div>
              {q.discount_pence > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{pence(q.discount_pence)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">VAT (20%)</span>
                <span className="font-medium text-ink">{pence(q.vat_pence)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-hairline pt-3">
                <span className="text-base font-bold text-ink">Total</span>
                <span className="font-display text-2xl font-extrabold text-ink">{pence(q.total_pence)}</span>
              </div>
              <p className="text-right text-[10px] text-muted">VAT included · GBP</p>
            </div>

            <div className="space-y-2 border-t border-hairline pt-3">
              <label className="block text-xs font-bold text-ink">Promo code</label>
              <div className="flex gap-2">
                <Controller
                  control={control}
                  name="promoCode"
                  render={({ field }) => (
                    <Input
                      placeholder="e.g. SAVE10"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="flex-1 font-mono-utility text-xs uppercase"
                      disabled={!!promoDiscount || Boolean(paymentSecret)}
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
                    disabled={Boolean(paymentSecret)}
                  >
                    Clear
                  </Button>
                ) : (
                  <Button type="button" onClick={applyPromo} disabled={!promoCodeValue}>
                    Apply
                  </Button>
                )}
              </div>
              {promoError && <p className="text-[11px] font-medium text-danger">{promoError}</p>}
              {promoDiscount && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" /> Promo applied
                </p>
              )}
              {walletBalance > 0 && (
                <label className="mt-2 flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={applyWallet}
                    onChange={(e) => setApplyWallet(e.target.checked)}
                    className="h-4 w-4 rounded border-hairline"
                    disabled={Boolean(paymentSecret)}
                  />
                  Apply wallet (£{(walletBalance / 100).toFixed(2)})
                </label>
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* Mobile sticky: Back / Next / Confirm */}
      <StickyActionBar>
        {step !== 'address' && !paymentSecret ? (
          <Button type="button" variant="outline" onClick={goBack} className="min-h-12 shrink-0 px-3">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Back</span>
          </Button>
        ) : (
          <div className="min-w-[2.75rem]" />
        )}

        <StickyActionMeta label="Total (inc. VAT)" value={pence(q.total_pence)} />

        {step !== 'confirm' ? (
          <Button type="button" onClick={goNext} className="min-h-12 px-5">
            Next
          </Button>
        ) : selectedPaymentMethod === 'card' && paymentSecret ? (
          <Button type="button" onClick={confirmPayment} disabled={payBusy} className="min-h-12 px-5">
            {payBusy ? 'Processing…' : 'Pay card'}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => handleSubmit(onCheckoutSubmit)()}
            disabled={submitting || !selectedAddressId}
            className="min-h-12 px-5"
          >
            {submitting ? 'Booking…' : 'Confirm'}
          </Button>
        )}
      </StickyActionBar>
    </div>
  );
}
