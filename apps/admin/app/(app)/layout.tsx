import { redirect } from 'next/navigation';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { LogOut } from 'lucide-react';
import { DesktopNav, MobileNav } from './nav-links';

function SearchForm({ className }: { className?: string }) {
  return (
    <form action="/search" className={className}>
      <input
        type="search"
        name="q"
        placeholder="Search users, bookings, tickets…"
        className="w-full rounded-xl border border-hairline bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </form>
  );
}

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const sessionDb = getSupabaseServer();
  const {
    data: { user },
  } = await sessionDb.auth.getUser();

  if (!user) redirect('/login');

  // All admin application data reads use the service-role client.
  const db = createServiceRole();
  const [{ data: profile }, kycPendingRes, { data: memberships }] = await Promise.all([
    db.from('profiles').select('role, full_name, email').eq('id', user.id).single(),
    db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'provider')
      .eq('kyc_status', 'pending'),
    (db as any)
      .from('admin_user_roles')
      .select('admin_roles!inner(code)')
      .eq('user_id', user.id),
  ]);

  if (!profile || !memberships?.length) redirect('/login');

  const kycPending = kycPendingRes.count ?? 0;
  const identityName = profile.full_name ?? 'Admin';
  const identityEmail = profile.email ?? user.email ?? '';
  const identityRole = memberships[0]?.admin_roles?.code?.replaceAll('_', ' ') ?? 'admin';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-sunk">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-card"
      >
        Skip to main content
      </a>
      {/* MOBILE HEADER */}
      <header className="lg:hidden border-b border-hairline bg-white">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="font-display text-sm font-bold text-ink">Admin Dashboard</span>
          <span className="max-w-[45%] truncate text-[11px] text-muted">{identityEmail}</span>
        </div>
        <SearchForm className="px-4 py-2.5" />
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-hairline px-4 py-6 gap-1 shrink-0 bg-white">
        <div className="px-2 mb-4">
          <span className="font-display text-base font-bold text-ink">Urban Assist</span>
          <span className="ml-1 text-xs text-muted font-mono">ADMIN</span>
        </div>

        <SearchForm className="px-2 mb-2" />

        <div className="flex-1 overflow-y-auto min-h-0">
          <DesktopNav kycPending={kycPending} />
        </div>

        <div className="mt-auto shrink-0">
          <div className="border-t border-hairline px-2 py-3">
            <p className="truncate text-xs font-medium text-ink">{identityName}</p>
            <p className="truncate text-[11px] text-muted">{identityEmail}</p>
            <p className="truncate text-[10px] capitalize text-muted">{identityRole}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              id="admin-logout"
              className="tap flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT AREA — sunk gutter so white bento tiles lift */}
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto p-6 pb-24 lg:p-8 lg:pb-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav aria-label="Admin mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
        <MobileNav kycPending={kycPending} />
      </nav>
    </div>
  );
}
