import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getActAsSession } from '@/utils/authCookie';

/**
 * Wraps a seller page that an admin "manage as seller" session may not use (account settings, plan billing).
 * Normal seller sessions see the page unchanged. The server refuses these actions too; this just explains it.
 */
export function ActAsLocked({ what, children, blockKind = 'all' }: { what: string; children: ReactNode; /** 'collaborator' = locked only for store team members (an admin may still read it). */ blockKind?: 'all' | 'collaborator' }) {
  const { storeId } = useParams();
  const session = getActAsSession();
  if (!session || (blockKind === 'collaborator' && session.kind !== 'collaborator')) return <>{children}</>;
  return (
    <div className="mx-auto max-w-[520px] px-4 py-16 text-center">
      <Lock size={28} className="mx-auto text-slate" aria-hidden="true" />
      <h1 className="mt-3 font-serif text-[22px] text-carbon font-normal">{what} is locked</h1>
      <p className="mt-2 text-[13px] text-slate leading-[1.6]">
        {session.kind === 'collaborator' ? 'You are working in this store as a team member.' : 'You are managing this store as Edudeen admin.'} {what} {session.kind === 'collaborator' ? 'are for the store owner only.' : 'can only be changed by the seller.'}
      </p>
      <Link to={storeId ? `/store/${storeId}/dashboard` : '/'} className="mt-5 inline-flex min-h-[44px] items-center rounded-lg border border-bone px-4 text-[13px] font-semibold text-carbon no-underline">
        Back to dashboard
      </Link>
    </div>
  );
}
