'use client';
import * as React from 'react';
import { Card, Badge, Button, Field, RatingInput, EmptyState, Input } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import {
  Phone,
  MessageSquare,
  MapPin,
  Play,
  CheckCircle2,
  Clock,
  Camera,
  Star,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

type CompletionReport = {
  notes: string;
  storage_path: string | null;
};

function parseCompletionReport(value: unknown): CompletionReport | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as Partial<CompletionReport>;
    if (typeof parsed.notes !== 'string') return null;
    if (parsed.storage_path !== null && typeof parsed.storage_path !== 'string') return null;
    return { notes: parsed.notes, storage_path: parsed.storage_path ?? null };
  } catch {
    return null;
  }
}

// SwipeToConfirm component for native-feeling mobile transitions
function SwipeToConfirm({
  onConfirm,
  label,
  disabled,
}: {
  onConfirm: () => void;
  label: string;
  disabled?: boolean;
}) {
  const [startX, setStartX] = React.useState(0);
  const [currentX, setCurrentX] = React.useState(0);
  const [isSwiped, setIsSwiped] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isSwiped) return;
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || isSwiped || !containerRef.current) return;
    const diff = e.touches[0].clientX - startX;
    const maxSlide = containerRef.current.clientWidth - 56; // slider handle width is 48px + padding
    if (diff > 0) {
      setCurrentX(Math.min(diff, maxSlide));
    }
  };

  const handleTouchEnd = () => {
    if (disabled || isSwiped || !containerRef.current) return;
    const maxSlide = containerRef.current.clientWidth - 56;
    if (currentX >= maxSlide * 0.8) {
      setCurrentX(maxSlide);
      setIsSwiped(true);
      onConfirm();
    } else {
      setCurrentX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isSwiped) return;
    setStartX(e.clientX);
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const diff = moveEvent.clientX - e.clientX;
      const maxSlide = containerRef.current.clientWidth - 56;
      if (diff > 0) {
        setCurrentX(Math.min(diff, maxSlide));
      }
    };
    const onMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (!containerRef.current) return;
      const maxSlide = containerRef.current.clientWidth - 56;
      const currentDiff = upEvent.clientX - e.clientX;
      if (currentDiff >= maxSlide * 0.8) {
        setCurrentX(maxSlide);
        setIsSwiped(true);
        onConfirm();
      } else {
        setCurrentX(0);
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  React.useEffect(() => {
    if (!disabled) {
      setIsSwiped(false);
      setCurrentX(0);
    }
  }, [disabled, label]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-14 bg-bg border border-hairline rounded-full flex items-center justify-center select-none overflow-hidden ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <div
        className="absolute left-1 top-1 bottom-1 w-12 bg-ink text-bg rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 transition-transform duration-75"
        style={{ transform: `translateX(${currentX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <span className="font-bold text-xs select-none">{'>>>'}</span>
      </div>
      <span className="text-xs font-bold text-ink pl-8 pointer-events-none animate-pulse">
        {label}
      </span>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [booking, setBooking] = React.useState<any>(null);
  const [payment, setPayment] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [drawerOpen, setDrawerOpen] = React.useState(true);

  // Completion states
  const [notes, setNotes] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null);
  const [completionPhotoUrl, setCompletionPhotoUrl] = React.useState<string | null>(null);

  // Review states
  const [rating, setRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewed, setReviewed] = React.useState(false);

  // OTP states
  const [enteredOtp, setEnteredOtp] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);

  // Geolocation
  const [providerLoc, setProviderLoc] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setProviderLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.log('Geolocation error', err),
        { enableHighAccuracy: true },
      );
    }
  }, []);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: b, error: bErr } = await sb
          .from('bookings')
          .select(
            '*, category:service_categories(name,slug), address:addresses(*), customer:profiles!bookings_customer_id_fkey(id,full_name,phone,avatar_url)',
          )
          .eq('id', id)
          .single();

        if (bErr || !b) {
          router.replace('/');
          return;
        }

        const { data: p } = await sb.from('payments').select('*').eq('booking_id', id).single();

        setBooking(b);
        setPayment(p);

        // Fetch messages
        const { data: msgData } = await sb
          .from('messages')
          .select('*')
          .eq('booking_id', id)
          .order('created_at');
        setMessages(msgData ?? []);

        // Check if already reviewed customer
        const { data: reviewData } = await sb
          .from('reviews')
          .select('id')
          .eq('booking_id', id)
          .eq('direction', 'provider_to_customer')
          .maybeSingle();

        if (reviewData) setReviewed(true);
      } catch (err) {
        console.error('Failed to load job data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, router]);

  // Realtime subscription
  React.useEffect(() => {
    if (!booking) return;
    const sb = supabase();
    const ch = sb
      .channel(`job-${booking.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${booking.id}` },
        (p) => setBooking((cur: any) => ({ ...cur, ...p.new })),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${booking.id}`,
        },
        (p) => setMessages((m) => [...m, p.new]),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `booking_id=eq.${booking.id}`,
        },
        (p) => setPayment((cur: any) => ({ ...cur, ...p.new })),
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [booking]);

  React.useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function connectStatusStream() {
      try {
        const response = await fetch('/api/firebase/token', { method: 'POST' });
        if (!response.ok) return;
        const payload = (await response.json()) as { token?: string };
        if (!payload.token || !active) return;
        const { subscribeToBookingStatus } = await import(
          '@urban-assist/integrations/firebase/status-client'
        );
        unsubscribe = await subscribeToBookingStatus({
          bookingId: id,
          customToken: payload.token,
          participant: 'provider_id',
          onEvents(events) {
            const latest = events.at(-1);
            if (latest && active) {
              setBooking((current: Record<string, unknown> | null) => ({
                ...(current ?? {}),
                status: latest.status,
              }));
            }
          },
        });
      } catch (error) {
        console.warn('[urban-assist] Firebase status stream unavailable', error);
      }
    }

    void connectStatusStream();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [id]);

  // Timer for job in-progress state
  React.useEffect(() => {
    if (booking?.status !== 'in_progress' || !booking.started_at) return;
    const start = new Date(booking.started_at).getTime();
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [booking?.status, booking?.started_at]);

  React.useEffect(() => {
    const report = parseCompletionReport(booking?.completion_report);
    if (!report?.storage_path) {
      setCompletionPhotoUrl(null);
      return;
    }
    let active = true;
    supabase()
      .storage.from('completion-photos')
      .createSignedUrl(report.storage_path, 3600)
      .then(({ data, error }) => {
        if (active) setCompletionPhotoUrl(error ? null : (data?.signedUrl ?? null));
      });
    return () => {
      active = false;
    };
  }, [booking?.completion_report]);

  async function updateStatus(
    nextStatus: 'on_the_way' | 'arrived' | 'in_progress' | 'cancelled',
    startCode?: string,
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, start_code: startCode }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error ?? 'Status update failed');
      }
      const data = await res.json();
      setBooking((cur: any) => ({ ...cur, ...data }));
    } catch (e: any) {
      if (nextStatus === 'in_progress') {
        setOtpError(
          e.message === 'too_many_attempts'
            ? 'Too many attempts. Try again later.'
            : 'Incorrect verification code. Please ask the customer.',
        );
      } else {
        alert(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmCash() {
    setBusy(true);
    try {
      const res = await fetch('/api/cash-confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      });
      if (!res.ok) throw new Error('Failed to confirm cash collection');
      setPayment((cur: any) => ({ ...cur, status: 'succeeded' }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadCompletion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setUploadProgress('Uploading completion report…');
    try {
      const form = new FormData();
      form.set('notes', notes.trim());
      if (file) form.set('photo', file);
      const response = await fetch(`/api/jobs/${booking.id}/complete`, {
        method: 'POST',
        body: form,
      });
      const completed = await response.json();
      if (!response.ok) throw new Error(completed.error ?? 'Completion failed');
      setBooking(completed);
      setUploadProgress(null);
    } catch (err: any) {
      alert(err.message);
      setUploadProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function submitCustomerReview() {
    setBusy(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: id, rating, comment: reviewComment || null }),
      });
      if (!res.ok) throw new Error('Could not submit review');
      setReviewed(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft;
    setDraft('');
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: id, content: body }),
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-48 bg-hairline rounded-xl" />
      </div>
    );
  }

  const formatTimer = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completionReport = parseCompletionReport(booking.completion_report);

  // Directions routing embed map URL
  const jobLat = booking?.address?.lat;
  const jobLng = booking?.address?.lng;
  const mapUrl =
    providerLoc && jobLat && jobLng
      ? `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${providerLoc.lat},${providerLoc.lng}&destination=${jobLat},${jobLng}&zoom=12`
      : jobLat && jobLng
        ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${jobLat},${jobLng}&zoom=14`
        : null;

  return (
    <div className="h-full flex flex-col lg:flex-row -mx-4 lg:-mx-8 -my-6 overflow-hidden">
      {/* LEFT PANEL / TOP VIEW: Live Routing Map */}
      <div className="flex-1 min-h-[35vh] lg:min-h-0 relative bg-bg/50 border-r border-hairline">
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="w-full h-full border-none"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted">
            <MapPin className="h-10 w-10 text-muted mb-2 motion-safe:animate-pulse" />
            <p className="text-sm font-semibold text-ink">Routing Map Unavailable</p>
            <p className="text-xs mt-1">Please enable location services or complete setup.</p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL / DRAWER: Customer details & execution control */}
      <div
        className={`w-full lg:w-96 shrink-0 bg-white flex flex-col transition-all duration-300 z-20 ${
          drawerOpen ? 'h-[65vh] lg:h-full' : 'h-16 lg:h-full'
        }`}
      >
        {/* Toggle bar for mobile drawer */}
        <div
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-hairline cursor-pointer bg-bg/20"
        >
          <div className="flex items-center gap-2">
            <Badge tone={booking.status === 'completed' ? 'success' : 'accent'}>
              {booking.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            <span className="font-mono-utility text-xs text-muted">#{booking.short_code}</span>
          </div>
          {drawerOpen ? (
            <ChevronDown className="h-4 w-4 text-ink" />
          ) : (
            <ChevronUp className="h-4 w-4 text-ink" />
          )}
        </div>

        {/* Content list */}
        <div
          className={`flex-1 overflow-y-auto p-5 space-y-5 ${!drawerOpen ? 'hidden lg:block' : ''}`}
        >
          {/* Header */}
          <div className="hidden lg:flex justify-between items-start">
            <div>
              <h1 className="font-display text-lg font-bold text-ink">{booking.category?.name}</h1>
              <p className="font-mono-utility text-xs text-muted">#{booking.short_code}</p>
            </div>
            <Badge tone={booking.status === 'completed' ? 'success' : 'accent'}>
              {booking.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Customer info card */}
          <Card className="p-4 border border-hairline space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted uppercase font-mono-utility">Customer</p>
                <h3 className="font-bold text-ink text-sm sm:text-base mt-0.5">
                  {booking.customer?.full_name}
                </h3>
              </div>
              <div className="flex gap-2">
                {booking.customer?.phone && (
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="tap p-2 border border-hairline rounded-xl hover:bg-bg transition text-ink"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted uppercase font-mono-utility">Location</p>
              <p className="text-xs text-ink mt-0.5 leading-relaxed">
                {[
                  booking.address?.line1,
                  booking.address?.line2,
                  booking.address?.city,
                  booking.address?.postcode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </Card>

          {/* Action states (Transitions) */}
          {booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <div className="space-y-4">
              {booking.status === 'in_progress' && (
                <div className="flex flex-col items-center justify-center py-4 bg-accent/5 rounded-2xl border border-accent/15">
                  <span className="font-mono-utility text-[10px] text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-pulse text-accent" /> In Progress Timer
                  </span>
                  <span className="font-display text-2xl font-bold mt-1 text-ink">
                    {formatTimer(elapsed)}
                  </span>
                </div>
              )}

              {/* Swipe to Transition Sliders */}
              {booking.status === 'assigned' && (
                <SwipeToConfirm
                  disabled={busy}
                  label={busy ? 'Starting route…' : 'SWIPE TO START ROUTE'}
                  onConfirm={() => updateStatus('on_the_way')}
                />
              )}

              {booking.status === 'on_the_way' && (
                <SwipeToConfirm
                  disabled={busy}
                  label={busy ? 'Arriving…' : 'SWIPE TO MARK ARRIVED'}
                  onConfirm={() => updateStatus('arrived')}
                />
              )}

              {booking.status === 'arrived' && (
                <Card className="p-4 border border-hairline bg-bg/10 rounded-2xl space-y-3">
                  <Field label="Enter 4-Digit Customer Verification Code">
                    <Input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      value={enteredOtp}
                      onChange={(e) => {
                        setEnteredOtp(e.target.value.replace(/\D/g, ''));
                        setOtpError(null);
                      }}
                      className="text-center font-display text-lg tracking-widest"
                    />
                  </Field>
                  {otpError && <p className="text-xs text-danger">{otpError}</p>}
                  <Button
                    size="block"
                    disabled={busy || enteredOtp.length !== 4}
                    onClick={() => {
                      void updateStatus('in_progress', enteredOtp);
                    }}
                  >
                    <Play className="mr-1.5 h-4 w-4" /> Verify and Start Job
                  </Button>
                </Card>
              )}

              {/* Completion uploader */}
              {booking.status === 'in_progress' && (
                <form
                  onSubmit={uploadCompletion}
                  className="space-y-3 border-t border-hairline pt-3 mt-2"
                >
                  <Field label="Job completion notes">
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
                      placeholder="Summarize the work done..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Completion photo (optional)">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                        id="completion-file"
                      />
                      <label
                        htmlFor="completion-file"
                        className="tap cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-4 py-2 text-xs font-medium hover:bg-bg transition"
                      >
                        <Camera className="h-4 w-4 text-muted" />{' '}
                        {file ? 'Change Photo' : 'Add Photo'}
                      </label>
                      {file && (
                        <span className="text-xs text-muted truncate max-w-[120px]">
                          {file.name}
                        </span>
                      )}
                    </div>
                  </Field>
                  {uploadProgress && <p className="text-xs text-accent">{uploadProgress}</p>}
                  <Button size="block" type="submit" disabled={busy}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Complete and Submit Job
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Payment & ledger summary */}
          <Card className="p-4 border border-hairline space-y-2">
            <div className="text-xs font-mono-utility text-muted">Payment Details</div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Customer Pays:</span>
              <span className="font-display text-base font-bold">{pence(booking.total_pence)}</span>
            </div>
            <div className="text-xs text-muted">
              Method: {booking.payment_method === 'card' ? 'Card' : 'Cash'} ·{' '}
              <span
                className={
                  payment?.status === 'succeeded' ? 'text-success font-semibold' : 'text-accent'
                }
              >
                {(payment?.status ?? 'pending').toUpperCase()}
              </span>
            </div>
            {booking.payment_method === 'cash' &&
              booking.status === 'completed' &&
              payment?.status !== 'succeeded' && (
                <Button onClick={confirmCash} disabled={busy} className="w-full mt-2 text-xs">
                  Confirm Cash Collected
                </Button>
              )}
          </Card>

          {/* Completion details if finished */}
          {booking.status === 'completed' && completionReport && (
            <Card className="p-4 border border-hairline space-y-3">
              <div className="text-xs font-mono-utility text-muted">Completion Report</div>
              <p className="text-xs text-ink leading-relaxed">
                {completionReport.notes}
              </p>
              {completionReport.storage_path && completionPhotoUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-hairline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={completionPhotoUrl ?? ''}
                    alt="Job completion visual"
                    className="w-full object-cover"
                  />
                </div>
              )}
            </Card>
          )}

          {/* Realtime messages chat */}
          <Card className="p-4 border border-hairline space-y-3">
            <div className="text-xs font-mono-utility text-muted flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-muted" /> Chat with Customer
            </div>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs bg-bg/30 p-2 rounded-xl border border-hairline">
              {messages.length === 0 && (
                <li className="text-muted text-center py-4 text-xs">
                  No messages. Send a message to start communicating.
                </li>
              )}
              {messages.map((m) => {
                const isSelf = m.sender_id === booking.provider_id;
                return (
                  <li
                    key={m.id}
                    className={`flex flex-col max-w-[80%] rounded-xl px-3 py-1.5 ${
                      isSelf ? 'bg-ink text-bg ml-auto' : 'bg-bg text-ink mr-auto'
                    }`}
                  >
                    <span>{m.content}</span>
                    <span className="text-[7px] text-muted self-end mt-0.5">
                      {new Date(m.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
            {booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <form onSubmit={sendChatMessage} className="flex gap-2">
                <input
                  className="tap flex-1 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs focus:border-ink focus:outline-none"
                  placeholder="Message customer..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button type="submit" disabled={!draft.trim()} className="px-3 py-1.5 text-xs">
                  Send
                </Button>
              </form>
            )}
          </Card>

          {/* Rating customer review */}
          {booking.status === 'completed' && !reviewed && (
            <Card className="p-4 border border-hairline space-y-3">
              <div className="text-xs font-mono-utility text-muted flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-accent" /> Rate Customer
              </div>
              <RatingInput value={rating} onChange={setRating} />
              <Field label="Comment (optional)">
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-xs focus:border-ink focus:outline-none"
                  placeholder="Describe your experience working with this customer..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </Field>
              <Button onClick={submitCustomerReview} disabled={rating === 0 || busy} size="block">
                Submit Rating
              </Button>
            </Card>
          )}

          {booking.status === 'completed' && reviewed && (
            <EmptyState
              title="Customer reviewed"
              description="You have submitted your rating for this customer."
            />
          )}
        </div>
      </div>
    </div>
  );
}
