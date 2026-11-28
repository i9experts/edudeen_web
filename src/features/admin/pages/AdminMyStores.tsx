import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Building2, Inbox, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useManageAsSeller } from '@/hooks/admin/useManageAsSeller';
import { apiMyManagedStores, ASSIGNMENT_ROLE_LABEL, MOU_STATUS_LABEL, type ManagedStoreRow } from '@/api/services/managedStores';

/** Team member's own list: the stores assigned to them (the owner sees every managed store), each one click from running it. */
export function AdminMyStores() {
  usePageTitle('My stores');
  const [rows, setRows] = useState<ManagedStoreRow[] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');
  const { start, busyId, error: operateError } = useManageAsSeller();

  const load = useCallback(() => {
    apiMyManagedStores()
      .then(r => { setError(''); setRows(r.data.items); setIsOwner(r.data.isOwner); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your stores.'));
  }, []);
  useEffect(() => { load(); }, [load]);
  const retry = () => { setError(''); setRows(null); load(); };

  return (
    <>
      <AdminPageHeader title="My stores" subtitle={isOwner ? 'Every managed store (you are the owner).' : 'The stores assigned to you. Open one to list products, handle orders and reply to buyers.'} icon={<Briefcase size={18} />} />
      <div className="px-4 sm:px-7 py-5 flex flex-col gap-3">
        {operateError && <p role="alert" className="m-0 text-[13px] text-error">{operateError}</p>}
        {error ? (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={retry} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
          </div>
        ) : rows === null ? (
          <div className="flex flex-col gap-3" aria-busy="true">{[0, 1, 2].map(i => <SkeletonBox key={i} className="h-16 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-bone bg-white px-4 py-10 text-center text-[13px] text-slate flex flex-col items-center gap-2"><Inbox size={22} /> No stores assigned to you yet. Ask the owner to assign one.</div>
        ) : (
          <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map(r => (
              <li key={r.id} className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-carbon truncate">{r.name}</span>
                    <span className="block text-[12px] text-slate truncate">{r.seller?.name ?? r.seller?.email ?? ''}{r.country ? ` · ${r.country}` : ''}</span>
                  </span>
                  {r.managementType === 'managed' && r.mou && <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-brand-pale-orange text-brand-orange">MOU {MOU_STATUS_LABEL[r.mou.status]}</span>}
                </div>
                <p className="m-0 text-[12px] text-graphite">
                  Ships: {r.fulfillmentMode === 'platform' ? 'Edudeen' : 'the seller'}
                  {r.assignees.length > 0 && <> · Team: {r.assignees.map(a => `${a.name ?? a.email} (${ASSIGNMENT_ROLE_LABEL[a.role]})`).join(', ')}</>}
                </p>
                <div><Button size="sm" icon={<Building2 size={13} />} onClick={() => start(r.id)} loading={busyId === r.id}>Operate store</Button></div>
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 text-[12px] text-slate">A store opens in a new tab for 30 minutes after you confirm your password. Open it again from here when it times out.</p>
      </div>
    </>
  );
}
