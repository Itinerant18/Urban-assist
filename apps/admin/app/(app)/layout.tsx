import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { LogOut } from 'lucide-react';
import { DesktopNav, MobileNav } from './nav-links';

function SearchForm({ className }: { className?: string }) {
  return (
    <form action="/search" className={className}>
      <input
        type="search"
        name="q"
        placeholder="Search users, bookings, tickets…"
        className="w-full rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none"
      />
    </form>
  );
}

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login');

  // Only allow admin-role users.
  const [{ data: profile }, kycPendingRes] = await Promise.all([
    db.from('profiles').select('role, full_name, email').eq('id', user.id).single(),
    db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'provider')
      .eq('kyc_status', 'pending'),
  ]);

  if (!profile || profile.role !== 'admin') redirect('/login');

  const kycPending = kycPendingRes.count ?? 0;
  const identityName = profile.full_name ?? 'Admin';
  const identityEmail = profile.email ?? user.email ?? '';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg">
      {/* MOBILE HEADER */}
      <header className="lg:hidden border-b border-hairline bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="font-display text-sm font-bold text-ink">Admin Dashboard</span>
          <span className="max-w-[45%] truncate text-[11px] text-muted">{identityEmail}</span>
        </div>
        <SearchForm className="px-4 py-2.5" />
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-hairline px-4 py-6 gap-1 shrink-0 bg-white">
        <div className="px-2 mb-4">
          <span className="font-display text-base font-bold text-ink">HomeEase</span>
          <span className="ml-1 text-xs text-muted font-mono-utility">ADMIN</span>
        </div>

        <SearchForm className="px-2 mb-4" />

        <DesktopNav kycPending={kycPending} />

        <div className="mt-auto">
          <div className="border-t border-hairline px-2 py-3">
            <p className="truncate text-xs font-medium text-ink">{identityName}</p>
            <p className="truncate text-[11px] text-muted">{identityEmail}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              id="admin-logout"
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-muted hover:text-danger hover:bg-danger/10 w-full transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto p-6 pb-24 lg:p-8 lg:pb-8">{children}</main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white pb-[env(safe-area-inset-bottom)] pt-2 shadow-lg lg:hidden">
        <MobileNav kycPending={kycPending} />
      </nav>
    </div>
  );
}
