import { useCallback, useEffect, useState } from 'react';
import { Modal, Button, SkeletonBox, StatusBadge, ConfirmActionModal } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { useBusyAction } from '@/hooks/useBusyAction';
import { apiAdminStoreMembers, apiAdminRemoveMember, type TeamMember } from '@/api/services/storeTeam';

/** Admin: who has access to a store. Read + remove only (the owner decides rights). Removal asks for the admin password. */
export function AdminStoreTeamModal({ storeId, storeName, onClose }: { storeId: string; storeName: string; onClose: () => void }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const { run, busy, error: removeError, setError: setRemoveError } = useBusyAction();

  const load = useCallback(() => {
    setError('');
    apiAdminStoreMembers(storeId).then(setMembers).catch(e => setError(e?.response?.data?.message ?? e?.message ?? 'Could not load the team.'));
  }, [storeId]);
  useEffect(load, [load]);

  return (
    <Modal mobileSheet title={`Team of ${storeName}`} onClose={onClose} width={520} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {error ? <AnalyticsErrorState message={error} onRetry={load} />
        : members === null ? <div className="flex flex-col gap-3"><SkeletonBox height={44} /><SkeletonBox height={44} /></div>
        : members.length === 0 ? <p className="text-[13px] text-slate">This store has no team members.</p>
        : (
          <ul className="flex flex-col gap-2">
            {members.map(m => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-bone px-3 py-2">
                <div className="min-w-0 flex-1 basis-[180px]">
                  <p className="text-[13px] font-semibold text-carbon truncate">{m.name || m.email}</p>
                  <p className="text-[12px] text-slate truncate">{m.email} · {m.roleName}</p>
                </div>
                <StatusBadge status={m.status === 'invited' ? 'pending' : m.status} size="sm" />
                <Button variant="outline" size="xs" onClick={() => { setRemoveError(''); setRemoving(m); }}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      {removing && (
        <ConfirmActionModal
          title="Remove this person from the store?" message="They lose access at once and the store owner is told."
          details={[{ label: 'Person', value: removing.email }, { label: 'Role', value: removing.roleName }]}
          confirmLabel="Remove" danger busy={busy} error={removeError} onClose={() => setRemoving(null)}
          onConfirm={() => run(async () => { await apiAdminRemoveMember(storeId, removing.id); setRemoving(null); load(); })}
        />
      )}
    </Modal>
  );
}
