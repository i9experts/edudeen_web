import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import client from '@/api/client';
import { endActAsSession, getActAsSession } from '@/utils/authCookie';

/** Shown on every seller page while an admin manages this store, or a store team member works in it (store-locked session, this tab only). */
export function ActAsBanner() {
  const [session] = useState(getActAsSession);
  const [left, setLeft] = useState(() => (session ? Math.max(0, session.expiresAt - Date.now()) : 0));
  const [leaving, setLeaving] = useState(false);
  const member = session?.kind === 'collaborator';
  const home = member ? '/' : '/admin';

  useEffect(() => {
    if (!session) return;
    const t = window.setInterval(() => {
      const ms = session.expiresAt - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) { endActAsSession(); window.location.assign(home); }
    }, 15_000);
    return () => window.clearInterval(t);
  }, [session, home]);

  if (!session) return null;

  async function exit() {
    if (leaving) return;
    setLeaving(true);
    // Best effort: revoke the token on the server too, then drop it from this tab and go back.
    try { await client.post('/api/auth/logout', {}); } catch { /* the token expires on its own */ }
    endActAsSession();
    window.location.assign(home);
  }

  const minutes = Math.ceil(left / 60_000);
  return (
    <div role="status" className="shrink-0 bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
      <ShieldAlert size={15} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {member ? (
          <>You are working in <strong>{session.storeName}</strong> as <strong>{session.roleName ?? 'a team member'}</strong>. Every change is recorded. </>
        ) : (
          <>You are managing <strong>{session.storeName}</strong> as Edudeen admin. Every change is recorded. Payouts, plan billing and account settings are locked. </>
        )}
        <span className="whitespace-nowrap">({minutes} min left)</span>
      </span>
      <button type="button" onClick={exit} disabled={leaving} className="rounded-md bg-amber-950 text-white px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60 min-h-[32px]">
        {leaving ? 'Exiting…' : 'Exit'}
      </button>
    </div>
  );
}
