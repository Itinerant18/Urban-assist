'use client';
import * as React from 'react';
import { Button, Card, Field, Input, Textarea } from '@urban-assist/ui';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Paperclip } from 'lucide-react';
import { ukDate } from '@urban-assist/lib';

const CATEGORIES = ['Booking issue', 'Payment or refund', 'Service quality', 'Account', 'Other'];

export function SupportForm() {
  const router = useRouter();
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [description, setDescription] = React.useState('');
  const [bookingId, setBookingId] = React.useState<string>('');
  const [evidenceFile, setEvidenceFile] = React.useState<File | null>(null);
  
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    async function loadBookings() {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb
        .from('bookings')
        .select('id, short_code, scheduled_start, category:service_categories(name)')
        .eq('customer_id', user.id)
        .order('scheduled_start', { ascending: false })
        .limit(10);
      setBookings(data ?? []);
    }
    loadBookings();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Stub: in a real app we'd upload the file to Supabase Storage first.
      let evidence_url = undefined;
      if (evidenceFile) {
        evidence_url = `https://storage.placeholder/evidence/${evidenceFile.name}`;
      }

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
           category, 
           description,
           booking_id: bookingId || undefined,
           evidence_url 
        }),
      });
      if (!res.ok) throw new Error('Could not submit — check your message is at least 10 characters.');
      setSent(true);
      setDescription('');
      setBookingId('');
      setEvidenceFile(null);
      router.refresh(); // re-fetch the server-rendered ticket list
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Card className="space-y-2 border border-hairline bg-white rounded-xl shadow-card p-6">
        <p className="text-sm font-medium text-success">Ticket submitted — we'll get back to you by email shortly.</p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>Raise another</Button>
      </Card>
    );
  }

  return (
    <Card className="border border-hairline bg-white shadow-card rounded-xl">
      <form onSubmit={submit} className="space-y-4">
        
        <Field label="What is this regarding?">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Related Booking (Optional)">
          <select
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">None / Not related to a specific booking</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {ukDate(b.scheduled_start)} - {b.category?.name} (#{b.short_code})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Describe the problem">
          <Textarea
            rows={5}
            required
            minLength={10}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened... (e.g. I was charged incorrectly, the provider didn't arrive, etc.)"
            className="w-full rounded-xl border border-hairline bg-white p-3 text-sm focus:border-accent focus:outline-none resize-none"
          />
        </Field>

        <div>
           <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*"
              onChange={(e) => {
                 if (e.target.files?.[0]) setEvidenceFile(e.target.files[0]);
              }}
           />
           <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 border-hairline text-muted"
              onClick={() => fileInputRef.current?.click()}
            >
             <Paperclip className="h-4 w-4" /> 
             {evidenceFile ? evidenceFile.name : 'Attach evidence (Photo/Screenshot)'}
           </Button>
           {evidenceFile && (
              <p className="text-[10px] text-muted mt-1 ml-1 cursor-pointer hover:underline" onClick={() => setEvidenceFile(null)}>Remove attachment</p>
           )}
        </div>

        {error && <p className="text-xs text-danger mt-2">{error}</p>}
        
        <div className="pt-2">
           <Button type="submit" disabled={busy || description.trim().length < 10} className="w-full">
             {busy ? 'Submitting…' : 'Submit Ticket'}
           </Button>
        </div>
      </form>
    </Card>
  );
}
