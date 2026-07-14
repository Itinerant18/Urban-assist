'use client';

import * as React from 'react';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { ShieldCheck, UserPlus, X, Settings2 } from 'lucide-react';

export default function StaffRolesPage() {
  const [loading, setLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [staff, setStaff] = React.useState<any[]>([]);

  // Invite form state
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = React.useState(false);

  // Manage modal state for Mobile
  const [editingStaff, setEditingStaff] = React.useState<any | null>(null);

  async function loadData() {
    const sb = supabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    // Verify if SuperAdmin
    const { data: perms } = await sb
      .from('admin_permissions')
      .select('can_manage_admins')
      .eq('profile_id', user.id)
      .single();

    if (perms?.can_manage_admins) {
      setIsSuperAdmin(true);
      // Fetch all staff roles
      const res = await fetch('/api/staff');
      if (res.ok) {
        setStaff(await res.json());
      }
    }
    setLoading(false);
  }

  React.useEffect(() => {
    loadData();
  }, []);

  async function handleTogglePermission(staffId: string, permissionKey: string, currentValue: boolean) {
    const updatedPermissions = {
      [permissionKey]: !currentValue
    };
    
    // Optimistic UI update
    setStaff(cur => cur.map(s => {
      if (s.profile_id === staffId) {
        return {
          ...s,
          [permissionKey]: !currentValue
        };
      }
      return s;
    }));

    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          profile_id: staffId,
          permissions: updatedPermissions
        })
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to update');
      }
    } catch (e: any) {
      alert(e.message);
      // Rollback
      setStaff(cur => cur.map(s => {
        if (s.profile_id === staffId) {
          return {
            ...s,
            [permissionKey]: currentValue
          };
        }
        return s;
      }));
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteBusy(true);

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          permissions: {
            can_manage_bookings: false,
            can_manage_kyc: false,
            can_manage_tickets: false,
            can_manage_admins: false,
          }
        })
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Invite failed');
      }

      // Reload
      setEmail('');
      setPassword('');
      setFullName('');
      setShowInviteModal(false);
      await loadData();
    } catch (e: any) {
      setInviteError(e.message);
    } finally {
      setInviteBusy(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-muted">Loading staff roles…</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <ShieldCheck className="h-12 w-12 text-danger opacity-40 animate-pulse" />
        <h1 className="font-display text-xl font-bold text-ink">Access Denied</h1>
        <p className="text-sm text-muted max-w-sm">
          You must have the `can_manage_admins` permission to view or manage staff access rights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Staff Permissions</h1>
          <p className="text-sm text-muted mt-1">Manage platform access for your operations team.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="tap flex items-center gap-2 rounded-xl bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite New Staff</span>
        </button>
      </header>

      {/* Desktop View Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-hairline bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-hairline/25 text-xs font-mono-utility text-muted uppercase">
              <th className="px-6 py-4 font-semibold">Staff Member</th>
              <th className="px-6 py-4 font-semibold text-center">Bookings</th>
              <th className="px-6 py-4 font-semibold text-center">KYC</th>
              <th className="px-6 py-4 font-semibold text-center">Tickets</th>
              <th className="px-6 py-4 font-semibold text-center">SuperAdmin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {staff.map((s) => (
              <tr key={s.id} className="text-sm text-ink hover:bg-hairline/10">
                <td className="px-6 py-4">
                  <div className="font-medium">{s.profile?.full_name || 'Unnamed'}</div>
                  <div className="text-xs text-muted font-mono-utility">{s.profile?.email}</div>
                  {s.profile_id === currentUser?.id && (
                    <span className="inline-block mt-1 text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-bold">
                      YOU
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={!!s.can_manage_bookings}
                    onChange={() => handleTogglePermission(s.profile_id, 'can_manage_bookings', !!s.can_manage_bookings)}
                    className="h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={!!s.can_manage_kyc}
                    onChange={() => handleTogglePermission(s.profile_id, 'can_manage_kyc', !!s.can_manage_kyc)}
                    className="h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={!!s.can_manage_tickets}
                    onChange={() => handleTogglePermission(s.profile_id, 'can_manage_tickets', !!s.can_manage_tickets)}
                    className="h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={!!s.can_manage_admins}
                    disabled={s.profile_id === currentUser?.id} // Prevent self lock-out
                    onChange={() => handleTogglePermission(s.profile_id, 'can_manage_admins', !!s.can_manage_admins)}
                    className="h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View Card List */}
      <div className="md:hidden space-y-3">
        {staff.map((s) => (
          <div key={s.id} className="card p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink text-sm">{s.profile?.full_name || 'Unnamed'}</p>
                {s.profile_id === currentUser?.id && (
                  <span className="text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-bold">
                    YOU
                  </span>
                )}
              </div>
              <p className="text-xs text-muted font-mono-utility mt-0.5">{s.profile?.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {s.can_manage_bookings && <span className="text-[10px] bg-hairline/50 px-2 py-0.5 rounded font-mono-utility text-ink">Bookings</span>}
                {s.can_manage_kyc && <span className="text-[10px] bg-hairline/50 px-2 py-0.5 rounded font-mono-utility text-ink">KYC</span>}
                {s.can_manage_tickets && <span className="text-[10px] bg-hairline/50 px-2 py-0.5 rounded font-mono-utility text-ink">Tickets</span>}
                {s.can_manage_admins && <span className="text-[10px] bg-accent/10 px-2 py-0.5 rounded font-mono-utility text-accent font-medium">SuperAdmin</span>}
                {!s.can_manage_bookings && !s.can_manage_kyc && !s.can_manage_tickets && !s.can_manage_admins && (
                  <span className="text-[10px] text-muted font-mono-utility italic">No permissions</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditingStaff(s)}
              className="tap w-full flex items-center justify-center gap-1.5 py-2 border border-hairline text-xs font-semibold text-ink rounded-lg hover:border-ink transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5 text-muted" />
              Manage Roles
            </button>
          </div>
        ))}
      </div>

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-bg rounded-2xl shadow-2xl border border-hairline overflow-hidden flex flex-col p-6 space-y-4">
            <header className="flex justify-between items-center">
              <h2 className="font-display font-bold text-lg text-ink">Invite Staff</h2>
              <button onClick={() => setShowInviteModal(false)} className="tap p-1.5 hover:bg-hairline/40 rounded-full">
                <X className="h-4 w-4 text-muted" />
              </button>
            </header>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border border-hairline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-hairline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Initial Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-hairline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              {inviteError && <p className="text-xs text-danger">{inviteError}</p>}
              <button
                type="submit"
                disabled={inviteBusy}
                className="w-full py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors"
              >
                {inviteBusy ? 'Inviting…' : 'Invite Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permission Modal for Mobile */}
      {editingStaff && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:hidden">
          <div className="w-full max-w-sm bg-bg rounded-2xl shadow-2xl border border-hairline overflow-hidden flex flex-col p-6 space-y-4">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display font-bold text-base text-ink">Manage Access</h2>
                <p className="text-xs text-muted">{editingStaff.profile?.full_name}</p>
              </div>
              <button onClick={() => setEditingStaff(null)} className="tap p-1.5 hover:bg-hairline/40 rounded-full">
                <X className="h-4 w-4 text-muted" />
              </button>
            </header>
            <div className="space-y-3">
              {[
                { key: 'can_manage_bookings', label: 'Bookings Management' },
                { key: 'can_manage_kyc', label: 'KYC Reviews' },
                { key: 'can_manage_tickets', label: 'Support Tickets' },
                { key: 'can_manage_admins', label: 'SuperAdmin Access', disabled: editingStaff.profile_id === currentUser?.id },
              ].map(({ key, label, disabled }) => (
                <label key={key} className="flex items-center justify-between p-3 border border-hairline rounded-xl hover:bg-hairline/10 transition-colors">
                  <span className="text-xs font-semibold text-ink">{label}</span>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={!!editingStaff[key]}
                    onChange={() => {
                      handleTogglePermission(editingStaff.profile_id, key, !!editingStaff[key]);
                      // Update editing local state
                      setEditingStaff((cur: any) => ({ ...cur, [key]: !cur[key] }));
                    }}
                    className="h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
