import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';

/**
 * Gates an admin page by the same permission the sidebar uses for `nav` (an ADMIN_NAV id).
 * Until the profile has loaded: skeleton. No permission: a "No access" card instead of a raw 403.
 * The server still enforces everything; this only avoids showing pages that would be refused.
 */
export function RequirePermission({ nav, children }: { nav: string; children: ReactNode }) {
  const { ready, failed, retry, canNav } = useAdminAccess();

  if (!ready && !failed) {
    return (
      <div className="p-6 space-y-4" role="status" aria-label="Loading">
        <div className="h-8 w-56 rounded-lg bg-cream animate-pulse" />
        <div className="h-32 rounded-xl bg-cream animate-pulse" />
        <div className="h-64 rounded-xl bg-cream animate-pulse" />
      </div>
    );
  }
  if (failed) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-16 rounded-2xl border border-bone bg-white p-8 text-center">
          <h1 className="text-[18px] font-bold text-carbon">Could not check your access</h1>
          <p className="mt-2 text-[14px] text-slate">Please check your connection and try again.</p>
          <button type="button" onClick={retry} className="mt-5 inline-flex items-center justify-center rounded-lg bg-brand-royal px-4 h-10 text-[14px] font-semibold text-white cursor-pointer border-0">Try again</button>
        </div>
      </div>
    );
  }
  if (!canNav(nav)) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-16 rounded-2xl border border-bone bg-white p-8 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-cream text-slate"><Lock size={20} /></span>
          <h1 className="text-[18px] font-bold text-carbon">No access</h1>
          <p className="mt-2 text-[14px] text-slate">Your account doesn't have the rights to open this page. Ask the owner to change your role if you need it.</p>
          <Link to="/admin" className="mt-5 inline-flex items-center justify-center rounded-lg bg-brand-royal px-4 h-10 text-[14px] font-semibold text-white no-underline">Back to Overview</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
