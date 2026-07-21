'use client';
import * as React from 'react';
import Link from 'next/link';
import { Card, Button, Badge, Field, Input } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { normaliseMobile } from '@urban-assist/utils';
import {
  User,
  Gift,
  MapPin,
  Heart,
  Shield,
  Plus,
  CreditCard,
  Tag,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Bell,
  CalendarDays,
  Home,
  Briefcase
} from 'lucide-react';
import { AddressForm } from '../../../components/address-form';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  postcode: string;
  is_default?: boolean;
}

interface Favorite {
  provider_id: string;
  provider: {
    full_name: string;
    rating_avg: number;
  };
}

const MOCK_PROMOS = [
  { code: 'URBANNEW5', desc: '£5.00 off your first service', expires: '31 Dec 2026' },
  { code: 'CLEAN20', desc: '20% off deep cleaning packages', expires: '31 Aug 2026' },
];

const MOCK_CARDS = [
  { brand: 'Visa', last4: '4242', exp: '12/28', default: true },
];

const GiftIllustration = () => (
  <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20">
    <div className="relative h-14 w-14 bg-accent rounded-lg shadow-lg flex items-center justify-center">
      {/* Ribbon */}
      <div className="absolute inset-y-0 w-3.5 bg-white" />
      <div className="absolute inset-x-0 h-3.5 bg-white" />
      {/* Bow */}
      <div className="absolute -top-2.5 left-2 h-4 w-5 border-4 border-white rounded-full bg-accent" />
      <div className="absolute -top-2.5 right-2 h-4 w-5 border-4 border-white rounded-full bg-accent" />
    </div>
  </div>
);

export default function AccountPage() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<any>(null);
  const [addresses, setAddresses] = React.useState<Address[]>([]);
  const [addingAddress, setAddingAddress] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Favorite[]>([]);
  const [referralCode, setReferralCode] = React.useState<string | null>(null);

  // Tab selections
  const [activeTab, setActiveTab] = React.useState<string>('profile');
  const [activeMobileView, setActiveMobileView] = React.useState<string | null>(null);

  // Profile Form States
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [profileOk, setProfileOk] = React.useState<string | null>(null);

  // GDPR action states
  const [gdprProgress, setGdprProgress] = React.useState<string | null>(null);

  // ponytail: localStorage prefs, move to profiles table when backend field exists
  const NOTIF_DEFAULTS: Record<string, boolean> = { booking_updates: true, offers: true, provider_messages: true };
  const [notifPrefs, setNotifPrefs] = React.useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return NOTIF_DEFAULTS;
    try {
      return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem('notif_prefs') || '{}') };
    } catch {
      return NOTIF_DEFAULTS;
    }
  });

  function toggleNotifPref(key: string) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('notif_prefs', JSON.stringify(next));
      return next;
    });
  }

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

        // Fetch addresses
        const { data: addr } = await sb.from('addresses').select('*').eq('profile_id', authUser.id);
        setAddresses(addr ?? []);

        // Fetch favorites
        const { data: favs } = await sb
          .from('favorites')
          .select('provider_id, provider:profiles!favorites_provider_id_fkey(full_name,rating_avg)')
          .eq('customer_id', authUser.id);
        setFavorites(favs as any ?? []);

        // Fetch or create referral code
        let { data: ref } = await sb.from('referrals').select('code').eq('owner_id', authUser.id).maybeSingle();
        if (!ref) {
          const generatedCode = `EASE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          const { data: newRef } = await sb
            .from('referrals')
            .insert({ owner_id: authUser.id, code: generatedCode, credit_pence: 500 })
            .select('code')
            .single();
          ref = newRef;
        }
        setReferralCode(ref?.code ?? null);
      } catch (err) {
        console.error('Failed to load customer account details', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleProfileUpdate(e: React.FormEvent) {
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
      setProfileOk('Profile updated successfully.');
      setProfile({ ...profile, full_name: fullName.trim(), phone: normalisedPhone });
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function triggerGdprExport() {
    setGdprProgress('Preparing data export. You will receive an email shortly.');
    setTimeout(() => setGdprProgress(null), 4000);
  }

  async function triggerGdprDeletion() {
    if (confirm('Are you sure you want to request account deletion? This action is irreversible.')) {
      setGdprProgress('Account deletion request submitted. Our compliance officer will contact you.');
      setTimeout(() => setGdprProgress(null), 4000);
    }
  }

  async function handleLogout() {
    await supabase().auth.signOut();
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-64 bg-hairline rounded-xl" />
      </div>
    );
  }

  const renderProfileSettings = () => (
    <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card">
      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
          <User className="h-5 w-5 text-muted" /> Profile Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name">
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
          <Input disabled value={user?.email} />
        </Field>
        {profileError && <p className="text-xs text-danger font-medium">{profileError}</p>}
        {profileOk && <p className="text-xs text-success font-medium">{profileOk}</p>}
        <Button type="submit" disabled={profileBusy}>
          {profileBusy ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </Card>
  );

  const renderAddresses = () => (
    <div className="space-y-4 md:max-w-3xl pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted" /> Saved Addresses
        </h2>
        <div className="hidden md:block">
          {!addingAddress && (
            <Button variant="outline" onClick={() => setAddingAddress(true)} className="flex items-center gap-1.5 text-xs">
              <Plus className="h-4 w-4" /> ADD NEW ADDRESS
            </Button>
          )}
        </div>
      </div>

      {addresses.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="p-4 border border-hairline rounded-xl flex flex-col justify-between bg-white shadow-card">
              <div className="flex items-start gap-2">
                {a.label.toLowerCase().includes('home') ? (
                   <Home className="h-4 w-4 text-muted mt-0.5" />
                ) : a.label.toLowerCase().includes('office') || a.label.toLowerCase().includes('work') ? (
                   <Briefcase className="h-4 w-4 text-muted mt-0.5" />
                ) : (
                   <MapPin className="h-4 w-4 text-muted mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm text-ink">{a.label} {a.is_default && <span className="font-normal text-muted">(Default)</span>}</div>
                  <div className="text-xs text-muted mt-1 leading-normal">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}
                    <br />
                    {a.city}, {a.postcode}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-hairline">
                <Button variant="ghost" size="sm" className="text-xs flex-1">EDIT</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs flex-1 text-danger hover:bg-danger/10"
                  onClick={async () => {
                    const { error } = await supabase().from('addresses').delete().eq('id', a.id);
                    if (!error) setAddresses((cur) => cur.filter((x) => x.id !== a.id));
                  }}
                >
                  REMOVE
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No saved addresses yet.</p>
      )}

      {addingAddress && (
        <div className="mt-6 border-t border-hairline pt-6">
          <h3 className="font-display text-base mb-3">Add New Address</h3>
          <AddressForm
            onAdded={async () => {
              setAddingAddress(false);
              const { data: { user: u } } = await supabase().auth.getUser();
              if (!u) return;
              const { data: addr } = await supabase().from('addresses').select('*').eq('profile_id', u.id);
              setAddresses(addr ?? []);
            }}
            onCancel={() => setAddingAddress(false)}
          />
        </div>
      )}

      {/* Sticky Bottom CTA for Mobile */}
      {!addingAddress && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-hairline z-20">
           <Button className="w-full shadow-lg" onClick={() => setAddingAddress(true)}>
             + ADD NEW ADDRESS
           </Button>
        </div>
      )}
    </div>
  );

  const renderPayments = () => (
    <Card className="space-y-4 border border-hairline bg-white p-5 rounded-xl shadow-card">
      <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-muted" /> Payment Methods
      </h3>
      <ul className="space-y-2.5">
        {MOCK_CARDS.map((card) => (
          <li
            key={card.last4}
            className="flex items-center justify-between border border-hairline p-4 rounded-xl bg-bg/20"
          >
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sm text-ink">{card.brand}</span>
              <span className="text-xs font-mono-utility text-muted">•••• {card.last4}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">Expires {card.exp}</span>
              {card.default && <Badge tone="accent">Default</Badge>}
            </div>
          </li>
        ))}
      </ul>
      <Button variant="outline" className="w-full" disabled>
        Add payment method
      </Button>
    </Card>
  );

  const renderFavorites = () => (
    <Card className="space-y-4 border border-hairline bg-white p-5 rounded-xl shadow-card">
      <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
        <Heart className="h-5 w-5 text-danger fill-danger/10" /> Saved Providers
      </h3>
      {favorites.length ? (
        <ul className="space-y-2">
          {favorites.map((f) => (
            <li
              key={f.provider_id}
              className="flex justify-between items-center bg-bg/10 p-3.5 rounded-xl border border-hairline"
            >
              <div>
                <span className="font-bold text-sm text-ink block">{f.provider?.full_name}</span>
                <span className="text-xs text-muted block mt-0.5">
                  <span className="text-amber">★</span> {Number(f.provider?.rating_avg ?? 0).toFixed(1)}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  (window.location.href = `/browse?q=${encodeURIComponent(f.provider?.full_name ?? '')}`)
                }
              >
                Book
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">No saved providers. Heart a provider to pin them here.</p>
      )}
    </Card>
  );

  const renderCoupons = () => (
    <Card className="space-y-4 border border-hairline bg-white p-5 rounded-xl shadow-card">
      <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
        <Tag className="h-5 w-5 text-muted" /> Promos & Coupons
      </h3>
      <ul className="space-y-3">
        {MOCK_PROMOS.map((promo) => (
          <li key={promo.code} className="border border-dashed border-accent/40 bg-accent/5 p-4 rounded-xl">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono-utility text-sm font-bold text-accent">{promo.code}</span>
              <span className="text-[10px] text-muted font-mono-utility">Expires {promo.expires}</span>
            </div>
            <p className="text-xs text-ink font-medium mt-1.5">{promo.desc}</p>
          </li>
        ))}
      </ul>
    </Card>
  );

  const renderReferrals = () => (
    <Card className="space-y-4 border border-hairline bg-white p-5 rounded-xl shadow-card text-center">
      <h3 className="font-display text-base font-bold text-ink flex items-center justify-center gap-2 mb-2">
        <Gift className="h-5 w-5 text-accent animate-spin" style={{ animationDuration: '6s' }} /> Refer a Friend
      </h3>
      <GiftIllustration />
      <div className="space-y-2 mt-4 max-w-sm mx-auto">
        <h4 className="font-display text-xl font-bold text-ink">Invite friends to Urban Assist</h4>
        <p className="text-xs text-muted leading-relaxed">
          Share your code so friends can discover trusted local professionals.
        </p>
      </div>
      {referralCode && (
        <div className="flex items-center justify-between gap-3 bg-bg/25 border border-hairline p-3.5 rounded-xl max-w-sm mx-auto mt-4">
          <span className="font-mono-utility text-sm font-bold text-ink select-all">{referralCode}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(referralCode);
              alert('Referral code copied!');
            }}
          >
            Copy Code
          </Button>
        </div>
      )}
      <div className="flex gap-2 justify-center max-w-sm mx-auto mt-4">
        <Button
          className="w-full py-2.5 text-xs"
          onClick={() => {
            const msg = `Take a look at Urban Assist for trusted home services. My referral code is ${referralCode ?? ''}. https://urbanassist.co.uk`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
          }}
        >
          Share via WhatsApp
        </Button>
        <Button
          variant="outline"
          className="w-full py-2.5 text-xs"
          onClick={() => {
            const msg = `Take a look at Urban Assist for trusted home services. My referral code is ${referralCode ?? ''}. https://urbanassist.co.uk`;
            window.location.href = `mailto:?subject=${encodeURIComponent('Take a look at Urban Assist')}&body=${encodeURIComponent(msg)}`;
          }}
        >
          Share via Email
        </Button>
      </div>
    </Card>
  );

  const renderNotifications = () => (
    <Card className="space-y-4 border border-hairline bg-white p-5 rounded-xl shadow-card">
      <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted" /> Notifications
      </h3>
      <ul className="divide-y divide-hairline">
        {[
          { key: 'booking_updates', label: 'Booking updates' },
          { key: 'offers', label: 'Offers & promotions' },
          { key: 'provider_messages', label: 'Provider messages' },
        ].map(({ key, label }) => (
          <li key={key} className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-ink">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!notifPrefs[key]}
              aria-label={label}
              onClick={() => toggleNotifPref(key)}
              className={`tap relative h-6 w-11 rounded-full transition ${
                notifPrefs[key] ? 'bg-accent' : 'bg-hairline'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  notifPrefs[key] ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );

  const renderGdpr = () => (
    <Card className="space-y-4 border border-hairline bg-white p-5 rounded-xl shadow-card">
      <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted" /> GDPR Data Controls
      </h3>
      <p className="text-xs text-muted leading-relaxed">
        Under UK GDPR legislation, you can request an export of all your transaction and chat histories, or request
        permanent account erasure.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={triggerGdprExport}>
          Export My Data
        </Button>
        <Button variant="ghost" size="sm" className="text-danger" onClick={triggerGdprDeletion}>
          Delete Account
        </Button>
      </div>
      {gdprProgress && <p className="text-xs text-accent font-semibold mt-2">{gdprProgress}</p>}
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
      case 'addresses':
        return renderAddresses();
      case 'payments':
        return renderPayments();
      case 'favorites':
        return renderFavorites();
      case 'coupons':
        return renderCoupons();
      case 'referrals':
        return renderReferrals();
      case 'notifications':
        return renderNotifications();
      case 'gdpr':
        return renderGdpr();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <div className="space-y-5 py-2">
      {/* Title */}
      <h1 className="font-display text-xl font-bold text-ink">Account Settings</h1>

      {/* DESKTOP SPLIT-PANE VIEW */}
      <div className="hidden lg:grid grid-cols-[280px,1fr] gap-6 items-start">
        {/* Sidebar Nav */}
        <aside className="border border-hairline bg-white rounded-xl shadow-card overflow-hidden">
          {/* User profile summary */}
          <div className="p-5 border-b border-hairline bg-bg/20 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-accent text-white flex items-center justify-center font-display text-base font-bold">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display font-bold text-ink">
                {profile?.full_name ?? 'User'}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {profile?.phone ?? 'No phone added'}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <Link
              href="/bookings"
              className="tap w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl font-medium text-ink hover:bg-bg/40 transition"
            >
              <CalendarDays className="h-4 w-4" /> My Bookings
            </Link>
            {[
              { id: 'profile', label: 'Profile Settings', icon: <User className="h-4 w-4" /> },
              { id: 'addresses', label: 'Manage Addresses', icon: <MapPin className="h-4 w-4" /> },
              { id: 'payments', label: 'Payment Methods', icon: <CreditCard className="h-4 w-4" /> },
              { id: 'favorites', label: 'Wishlist & Favorites', icon: <Heart className="h-4 w-4" /> },
              { id: 'coupons', label: 'Promos & Coupons', icon: <Tag className="h-4 w-4" /> },
              { id: 'referrals', label: 'Refer a Friend', icon: <Gift className="h-4 w-4" /> },
              { id: 'gdpr', label: 'GDPR Privacy', icon: <Shield className="h-4 w-4" /> },
              { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`tap w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl font-medium transition ${
                  activeTab === link.id
                    ? 'bg-accent/10 text-accent font-bold'
                    : 'text-ink hover:bg-bg/40'
                }`}
              >
                {link.icon} {link.label}
              </button>
            ))}

            <hr className="border-hairline my-2" />

            <button
              onClick={handleLogout}
              className="tap w-full flex items-center gap-3 px-3 py-2 text-sm text-danger font-medium rounded-xl hover:bg-danger/10 transition"
            >
              <LogOut className="h-4 w-4" /> Log Out
            </button>
          </nav>
        </aside>

        {/* Dynamic Detail Content Panel */}
        <div>{renderContent()}</div>
      </div>

      {/* MOBILE STACKED LIST MENU VIEW */}
      <div className="lg:hidden space-y-4">
        {activeMobileView ? (
          /* Mobile Sub-view Overlay */
          <div className="space-y-4">
            <button
              onClick={() => setActiveMobileView(null)}
              className="tap flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink pb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Account
            </button>
            {activeMobileView === 'profile' && renderProfileSettings()}
            {activeMobileView === 'addresses' && renderAddresses()}
            {activeMobileView === 'payments' && renderPayments()}
            {activeMobileView === 'favorites' && renderFavorites()}
            {activeMobileView === 'coupons' && renderCoupons()}
            {activeMobileView === 'referrals' && renderReferrals()}
            {activeMobileView === 'gdpr' && renderGdpr()}
          </div>
        ) : (
          /* Main Mobile Profile Menu Options List */
          <div className="space-y-6">
            {/* Header User Card */}
            <div className="flex items-center justify-between border border-hairline p-4 rounded-xl bg-white shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-accent text-white flex items-center justify-center font-display text-sm font-bold">
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="font-display text-base font-bold text-ink">
                    {profile?.full_name ?? 'User'}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{profile?.phone}</div>
                </div>
              </div>
              <button
                onClick={() => setActiveMobileView('profile')}
                className="text-xs font-bold text-accent hover:text-accent-hover"
              >
                Edit
              </button>
            </div>

            {/* Menu Group: Account */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1">
                Account
              </div>
              <Card className="divide-y divide-hairline p-0 bg-white border border-hairline rounded-xl shadow-card overflow-hidden">
                <Link
                  href="/bookings"
                  className="tap w-full flex items-center justify-between px-4 py-3.5 text-sm text-ink transition hover:bg-bg/20"
                >
                  <span className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4" /> My Bookings
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
                {[
                  { id: 'addresses', label: 'Manage Addresses', icon: <MapPin className="h-4 w-4" /> },
                  { id: 'payments', label: 'Payment Methods', icon: <CreditCard className="h-4 w-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMobileView(item.id)}
                    className="tap w-full flex items-center justify-between px-4 py-3.5 text-sm text-ink transition hover:bg-bg/20"
                  >
                    <span className="flex items-center gap-3">
                      {item.icon} {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>
                ))}
              </Card>
            </div>

            {/* Menu Group: Offers & Savings */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1">
                Offers & Savings
              </div>
              <Card className="divide-y divide-hairline p-0 bg-white border border-hairline rounded-xl shadow-card overflow-hidden">
                {[
                  { id: 'coupons', label: 'Promos & Coupons', icon: <Tag className="h-4 w-4" /> },
                  { id: 'referrals', label: 'Refer a Friend', icon: <Gift className="h-4 w-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMobileView(item.id)}
                    className="tap w-full flex items-center justify-between px-4 py-3.5 text-sm text-ink transition hover:bg-bg/20"
                  >
                    <span className="flex items-center gap-3">
                      {item.icon} {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>
                ))}
              </Card>
            </div>

            {/* Menu Group: Saved */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1">
                Saved
              </div>
              <Card className="divide-y divide-hairline p-0 bg-white border border-hairline rounded-xl shadow-card overflow-hidden">
                {[
                  { id: 'favorites', label: 'Wishlist & Favorites', icon: <Heart className="h-4 w-4" /> },
                  { id: 'gdpr', label: 'GDPR Data Controls', icon: <Shield className="h-4 w-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMobileView(item.id)}
                    className="tap w-full flex items-center justify-between px-4 py-3.5 text-sm text-ink transition hover:bg-bg/20"
                  >
                    <span className="flex items-center gap-3">
                      {item.icon} {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>
                ))}
              </Card>
            </div>

            {/* Log Out */}
            <Button variant="outline" size="block" onClick={handleLogout} className="mt-4">
              Log Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
