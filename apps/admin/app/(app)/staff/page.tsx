'use client';

import * as React from 'react';
import { getSupabaseBrowser } from '@urban-assist/db/browser';
import { Settings2, ShieldCheck, UserPlus, X } from 'lucide-react';

const ROLE_OPTIONS = [
  { code: 'super_admin', label: 'Super admin', description: 'Full platform and access management.' },
  { code: 'ops_admin', label: 'Operations', description: 'Bookings, assignment, vetting, and exceptions.' },
  { code: 'finance_admin', label: 'Finance', description: 'Payments, commissions, refunds, and payouts.' },
  { code: 'support_agent', label: 'Support', description: 'Disputes and customer communications.' },
  { code: 'analyst', label: 'Analyst', description: 'Read-only dashboards and audit access.' },
] as const;

type RoleCode = (typeof ROLE_OPTIONS)[number]['code'];
type StaffMember = {
  profile_id: string;
  profile?: { full_name?: string | null; email?: string | null } | null;
  roles: RoleCode[];
};

export default function StaffRolesPage() {
  const [loading, setLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [staff, setStaff] = React.useState<StaffMember[]>([]);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [inviteRoles, setInviteRoles] = React.useState<RoleCode[]>(['analyst']);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await getSupabaseBrowser().auth.getUser();
    setCurrentUserId(user?.id ?? null);
    if (!user) {
      setLoading(false);
      return;
    }

    const response = await fetch('/api/staff', { cache: 'no-store' });
    setIsSuperAdmin(response.ok);
    if (response.ok) setStaff(await response.json());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  async function updateRoles(member: StaffMember, nextRoles: RoleCode[]) {
    if (nextRoles.length === 0) return;
    const previous = member.roles;
    setStaff((current) => current.map((entry) =>
      entry.profile_id === member.profile_id ? { ...entry, roles: nextRoles } : entry,
    ));
    setEditingStaff((current) => current?.profile_id === member.profile_id
      ? { ...current, roles: nextRoles }
      : current);

    const response = await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile_id: member.profile_id, roles: nextRoles }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Failed to update roles' }));
      setStaff((current) => current.map((entry) =>
        entry.profile_id === member.profile_id ? { ...entry, roles: previous } : entry,
      ));
      setEditingStaff((current) => current?.profile_id === member.profile_id
        ? { ...current, roles: previous }
        : current);
      window.alert(payload.error || 'Failed to update roles');
    }
  }

  function toggleMemberRole(member: StaffMember, role: RoleCode) {
    const removingOwnSuperAdmin =
      member.profile_id === currentUserId && role === 'super_admin' && member.roles.includes(role);
    if (removingOwnSuperAdmin) return;
    const nextRoles = member.roles.includes(role)
      ? member.roles.filter((item) => item !== role)
      : [...member.roles, role];
    void updateRoles(member, nextRoles);
  }

  function toggleInviteRole(role: RoleCode) {
    setInviteRoles((current) => current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role]);
  }

  async function handleInviteSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (inviteRoles.length === 0) {
      setInviteError('Select at least one role.');
      return;
    }
    setInviteError(null);
    setInviteBusy(true);
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, roles: inviteRoles }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Invite failed');
      }
      setEmail('');
      setPassword('');
      setFullName('');
      setInviteRoles(['analyst']);
      setShowInviteModal(false);
      await loadData();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Invite failed');
    } finally {
      setInviteBusy(false);
    }
  }

  if (loading) return <div className="py-12 text-center text-muted">Loading admin roles…</div>;

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
        <ShieldCheck className="h-12 w-12 text-danger opacity-40" />
        <h1 className="font-display text-xl font-bold text-ink">Access denied</h1>
        <p className="max-w-sm text-sm text-muted">Only super admins can manage admin role memberships.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Admin roles</h1>
          <p className="mt-1 text-sm text-muted">Assign explicit operational, finance, support, and read-only access.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowInviteModal(true)}>
          <UserPlus className="h-4 w-4" /> Invite admin
        </button>
      </header>

      <div className="overflow-x-auto rounded-xl border border-hairline bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-hairline/25 text-xs uppercase text-muted">
              <th className="px-5 py-3 font-semibold">Admin</th>
              <th className="px-5 py-3 font-semibold">Roles</th>
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {staff.map((member) => (
              <tr key={member.profile_id} className="text-sm hover:bg-hairline/10">
                <td className="px-5 py-4">
                  <div className="font-medium text-ink">{member.profile?.full_name || 'Unnamed admin'}</div>
                  <div className="text-xs text-muted">{member.profile?.email}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {member.roles.map((role) => (
                      <span key={role} className="rounded-md bg-hairline/50 px-2 py-1 text-[10px] font-semibold uppercase text-ink">
                        {ROLE_OPTIONS.find((option) => option.code === role)?.label ?? role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="btn-secondary inline-flex items-center gap-1.5" onClick={() => setEditingStaff(member)}>
                    <Settings2 className="h-3.5 w-3.5" /> Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <Modal title="Invite admin" subtitle="Create an account and assign its initial roles." onClose={() => setShowInviteModal(false)}>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <Field label="Full name" type="text" value={fullName} onChange={setFullName} />
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Initial password" type="password" value={password} onChange={setPassword} />
            <RolePicker roles={inviteRoles} onToggle={toggleInviteRole} />
            {inviteError && <p className="text-xs text-danger">{inviteError}</p>}
            <button type="submit" disabled={inviteBusy || inviteRoles.length === 0} className="btn-primary w-full disabled:opacity-50">
              {inviteBusy ? 'Inviting…' : 'Invite admin'}
            </button>
          </form>
        </Modal>
      )}

      {editingStaff && (
        <Modal
          title="Manage roles"
          subtitle={editingStaff.profile?.full_name || editingStaff.profile?.email || 'Admin account'}
          onClose={() => setEditingStaff(null)}
        >
          <RolePicker
            roles={editingStaff.roles}
            onToggle={(role) => toggleMemberRole(editingStaff, role)}
            disabledRole={editingStaff.profile_id === currentUserId ? 'super_admin' : undefined}
          />
          <p className="mt-4 text-xs text-muted">Changes are applied immediately and written to the immutable audit log.</p>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-hairline bg-bg p-6 shadow-2xl">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="font-display text-lg font-bold text-ink">{title}</h2><p className="text-xs text-muted">{subtitle}</p></div>
          <button aria-label="Close" onClick={onClose} className="tap rounded-full p-1.5 hover:bg-hairline/40"><X className="h-4 w-4" /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange }: {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-muted">
      {label}
      <input className="input mt-1 w-full" type={type} required value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RolePicker({ roles, onToggle, disabledRole }: {
  roles: RoleCode[];
  onToggle: (role: RoleCode) => void;
  disabledRole?: RoleCode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-semibold text-muted">Role memberships</legend>
      {ROLE_OPTIONS.map((role) => (
        <label key={role.code} className="flex items-start justify-between gap-4 rounded-xl border border-hairline bg-white p-3">
          <span><span className="block text-sm font-semibold text-ink">{role.label}</span><span className="block text-xs text-muted">{role.description}</span></span>
          <input
            type="checkbox"
            checked={roles.includes(role.code)}
            disabled={disabledRole === role.code || (roles.length === 1 && roles[0] === role.code)}
            onChange={() => onToggle(role.code)}
            className="mt-1 h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
          />
        </label>
      ))}
    </fieldset>
  );
}
