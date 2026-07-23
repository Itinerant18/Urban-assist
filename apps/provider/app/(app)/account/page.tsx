'use client';
import * as React from 'react';
import { Card, Button, Badge, Field, Input } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { ukDate } from '@urban-assist/lib';
import { normaliseMobile } from '@urban-assist/utils';
import { Star, AlertTriangle, User } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author: { full_name: string } | null;
}

interface SupportTicket {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
}

export default function AccountPage() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<any>(null);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);

  // Editing profile states
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [profileOk, setProfileOk] = React.useState<string | null>(null);
  const [profileBusy, setProfileBusy] = React.useState(false);

  // Dispute ticket states
  const [ticketCat, setTicketCat] = React.useState('billing');
  const [ticketDesc, setTicketDesc] = React.useState('');
  const [ticketError, setTicketError] = React.useState<string | null>(null);
  const [ticketOk, setTicketOk] = React.useState<string | null>(null);
  const [ticketBusy, setTicketBusy] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: { user: authUser } } = await sb.auth.getUser();
        if (!authUser) return;
        setUser(authUser);

        // Fetch profile
        const { data: p } = await sb.from('profiles').select('*').eq('id', authUser.id).single();
        if (p) {
          setProfile(p);
          setFullName(p.full_name ?? '');
          setPhone(p.phone ?? '');
        }

        // Fetch reviews
        const { data: reviewsData } = await sb
          .from('reviews')
          .select('id, rating, comment, created_at, author:profiles!reviews_author_id_fkey(full_name)')
          .eq('target_id', authUser.id)
          .eq('direction', 'customer_to_provider')
          .order('created_at', { ascending: false });
        setReviews(reviewsData as any ?? []);

        // Fetch support tickets
        const { data: ticketsData } = await sb
          .from('support_tickets')
          .select('*')
          .eq('raised_by', authUser.id)
          .order('created_at', { ascending: false });
        setTickets(ticketsData ?? []);
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileOk(null);
    setProfileBusy(true);

    try {
      const cleanPhone = phone.trim();
      const normalisedPhone = cleanPhone ? normaliseMobile(cleanPhone) : '';
      if (cleanPhone && !normalisedPhone) {
        throw new Error('Enter a valid UK or Indian mobile number');
      }

      const sb = supabase();
      const { error } = await sb
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: normalisedPhone,
        })
        .eq('id', user.id);

      if (error) throw error;
      setProfileOk('Profile updated.');
      setProfile({ ...profile, full_name: fullName.trim(), phone: normalisedPhone });
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function submitSupportTicket(e: React.FormEvent) {
    e.preventDefault();
    setTicketError(null);
    setTicketOk(null);
    setTicketBusy(true);

    try {
      if (ticketDesc.trim().length < 10) {
        throw new Error('Please describe your issue in more detail (min 10 characters)');
      }

      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: ticketCat,
          description: ticketDesc.trim(),
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed to submit ticket');
      }

      const newTicket = await res.json();
      setTickets([newTicket, ...tickets]);
      setTicketOk('Support ticket raised. We will review and contact you.');
      setTicketDesc('');
    } catch (err: any) {
      setTicketError(err.message);
    } finally {
      setTicketBusy(false);
    }
  }

  const [gdprProgress, setGdprProgress] = React.useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = React.useState(false);

  async function handleAvatarUpload(file: File) {
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image too large (max 5 MB).');
      return;
    }
    setAvatarBusy(true);
    setProfileError(null);
    try {
      const sb = supabase();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = sb.storage.from('avatars').getPublicUrl(path);
      const { error } = await sb.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      if (error) throw error;
      setProfile({ ...profile, avatar_url: data.publicUrl });
    } catch (err: any) {
      setProfileError(err.message ?? 'Could not update photo.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleLogout() {
    await supabase().auth.signOut();
    window.location.href = '/login';
  }

  async function exportData() {
    setGdprProgress('Preparing your data export…');
    try {
      const res = await fetch('/api/account/export', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? 'Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'urban-assist-data.json';
      a.click();
      URL.revokeObjectURL(url);
      setGdprProgress('Your data has been downloaded.');
    } catch (err: any) {
      setGdprProgress(err.message ?? 'Export failed. Please try again.');
    } finally {
      setTimeout(() => setGdprProgress(null), 4000);
    }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account permanently? This cannot be undone.')) return;
    setGdprProgress('Deleting your account…');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? 'Deletion failed');
      await supabase().auth.signOut();
      window.location.href = '/login';
    } catch (err: any) {
      setGdprProgress(err.message ?? 'Deletion failed. Please try again.');
      setTimeout(() => setGdprProgress(null), 6000);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-48 bg-hairline rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-2">
      <header>
        <p className="font-mono-utility text-muted">Settings</p>
        <h1 className="font-display text-2xl font-bold text-ink">Account</h1>
      </header>

      {/* Edit Profile details card */}
      <Card>
        <form onSubmit={updateProfile} className="space-y-3">
          <h3 className="font-display text-sm font-semibold flex items-center gap-1">
            <User className="h-4 w-4 text-muted" /> Profile details
          </h3>
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-accent/10 flex items-center justify-center text-lg font-bold text-accent">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (fullName || 'U')[0].toUpperCase()
              )}
            </div>
            <label className="cursor-pointer text-xs font-semibold text-accent hover:underline">
              {avatarBusy ? 'Uploading…' : 'Change photo'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={avatarBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Full name">
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Phone number">
              <Input
                type="tel"
                placeholder="e.g. +44 7123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Email Address">
            <Input disabled value={user.email} />
          </Field>
          {profileError && <p className="text-xs text-danger">{profileError}</p>}
          {profileOk && <p className="text-xs text-success">{profileOk}</p>}
          <Button type="submit" disabled={profileBusy}>
            {profileBusy ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Card>

      {/* Support / Disputes tickets uploader */}
      <Card className="space-y-3">
        <h3 className="font-display text-sm font-semibold flex items-center gap-1">
          <AlertTriangle className="h-4 w-4 text-muted" /> Raise a support ticket
        </h3>
        <p className="text-xs text-muted">
          Need help with a dispute or payment? Report your issue below and our team will get in touch.
        </p>
        <form onSubmit={submitSupportTicket} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category">
              <select
                value={ticketCat}
                onChange={(e) => setTicketCat(e.target.value)}
                className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
              >
                <option value="billing">Payment & billing</option>
                <option value="dispute">Customer dispute</option>
                <option value="kyc">KYC verification</option>
                <option value="other">Other issue</option>
              </select>
            </Field>
          </div>
          <Field label="Describe your issue">
            <textarea
              rows={2}
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
              placeholder="What happened? Include booking codes if applicable."
              value={ticketDesc}
              onChange={(e) => setTicketDesc(e.target.value)}
              required
            />
          </Field>
          {ticketError && <p className="text-xs text-danger">{ticketError}</p>}
          {ticketOk && <p className="text-xs text-success">{ticketOk}</p>}
          <Button type="submit" disabled={ticketBusy}>
            {ticketBusy ? 'Submitting…' : 'Raise ticket'}
          </Button>
        </form>

        {/* Existing tickets list */}
        {tickets.length > 0 && (
          <div className="border-t border-hairline pt-3 mt-3 space-y-2">
            <span className="font-mono-utility text-xs text-muted">Your tickets</span>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {tickets.map((t) => (
                <li key={t.id} className="flex justify-between items-center text-xs">
                  <span className="truncate max-w-[200px] text-muted">{t.description}</span>
                  <Badge tone={t.status === 'open' ? 'accent' : 'success'}>
                    {t.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Reviews feed */}
      <Card className="space-y-3">
        <h3 className="font-display text-sm font-semibold flex items-center gap-1">
          <Star className="h-4 w-4 text-muted" /> Reviews received
        </h3>
        {!reviews.length ? (
          <p className="text-xs text-muted">You haven't received any customer reviews yet.</p>
        ) : (
          <ul className="space-y-2.5 divide-y divide-hairline max-h-60 overflow-y-auto pr-1">
            {reviews.map((r) => (
              <li key={r.id} className="pt-2.5 first:pt-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold">{r.author?.full_name ?? 'Customer'}</span>
                    <span className="text-[10px] text-muted ml-2">{ukDate(r.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-xs text-accent">
                    ★ {r.rating.toFixed(1)}
                  </div>
                </div>
                {r.comment && <p className="text-xs text-muted mt-1 italic">"{r.comment}"</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* GDPR Data Controls */}
      <Card className="space-y-2">
        <div className="text-xs font-mono-utility text-muted">Data & privacy (GDPR)</div>
        <p className="text-xs text-muted">
          Under UK GDPR, you have the right to request a data export or account deletion. We process all requests within 30 days.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={exportData}>
            Export My Data
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-danger" onClick={deleteAccount}>
            Delete Account
          </Button>
        </div>
        {gdprProgress && <p className="text-xs font-medium text-muted">{gdprProgress}</p>}
      </Card>

      {/* Logout button */}
      <Button variant="outline" size="block" onClick={handleLogout} className="flex items-center justify-center gap-1.5">
        Logout
      </Button>
    </div>
  );
}

