import { useMemo, useState, type ReactNode } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminUsersStats, useAdminUsersList, useAdminUserActions, useAdminUserDetail } from '@/hooks/admin/useAdminUsers';
import { useToast } from '@/contexts/ToastContext';
import type { AccountRole, AccountRow } from '@/api/services/users/adminUsers';
import { Table, StatusBadge, Badge, Button, Modal, SkeletonBox, SearchInput, FilterDropdown, MetricCard } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn } from '@/components/comman/ui';
import { CellText } from '@/components/comman/ui/Table';
import type { BadgeColor } from '@/types';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate, formatNumber } from '@/components/comman/analytics/format';
import { Users2, Eye, Ban, CheckCircle2 } from 'lucide-react';

const ROLE_COLOR: Record<AccountRole, BadgeColor> = { seller: 'orange', buyer: 'blue' };
const ROLE_LABEL: Record<AccountRole, string> = { seller: 'Seller', buyer: 'Buyer' };

const ROLE_OPTIONS = [{ value: 'seller', label: 'Seller' }, { value: 'buyer', label: 'Buyer' }];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

interface PersonRow { key: string; accounts: AccountRow[] }

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '—';
}

// ── Account detail modal ──────────────────────────────────────────────────────
function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><p className="text-[12px] text-slate mb-0.5">{label}</p><div className="text-charcoal break-words">{children}</div></div>;
}

function AccountDetailModal({ account, onClose, onChanged }: { account: AccountRow; onClose: () => void; onChanged: (msg: string) => void }) {
  const { suspend, unsuspend, processingId, error } = useAdminUserActions();
  // The list row only carries summary fields — load the full account when opened.
  const { detail, loading: detailLoading, error: detailError, reload } = useAdminUserDetail(account.role, account.id);
  const status = detail?.status ?? account.status;
  const isSuspended = status === 'suspended';

  async function toggle() {
    const ok = isSuspended ? await unsuspend(account.role, account.id) : await suspend(account.role, account.id);
    if (ok) onChanged(isSuspended ? 'Account unsuspended' : 'Account suspended');
  }

  return (
    <Modal mobileSheet
      title="Account Details"
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button
          variant={isSuspended ? 'secondary' : 'danger'}
          icon={isSuspended ? <CheckCircle2 size={13} /> : <Ban size={13} />}
          loading={processingId === account.id}
          onClick={toggle}
        >
          {isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
        </Button>
      </>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-pale-orange text-brand-deep-orange text-[13px] font-bold flex items-center justify-center shrink-0">
            {initialsOf(account.name)}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-charcoal">{account.name}</p>
            <p className="text-[12px] text-slate">{account.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <DetailField label="Role"><Badge color={ROLE_COLOR[account.role]} size="sm">{ROLE_LABEL[account.role]}</Badge></DetailField>
          <DetailField label="Status"><StatusBadge status={status} size="sm" /></DetailField>
          <DetailField label="Plan"><span className="capitalize">{account.plan}</span></DetailField>
          <DetailField label="Joined">{formatDate(account.createdAt)}</DetailField>
          {detailLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={34} rounded="6px" />)
          ) : detail ? (
            <>
              <DetailField label="Phone">{detail.phone || '—'}</DetailField>
              <DetailField label="Email verified">{detail.isVerified ? 'Yes' : 'No'}</DetailField>
              <DetailField label="Sign-in method"><span className="capitalize">{detail.authProvider || 'email'}</span></DetailField>
              <DetailField label="Last updated">{detail.updatedAt ? formatDate(detail.updatedAt) : '—'}</DetailField>
              {detail.address && <div className="col-span-2"><DetailField label="Address">{detail.address}</DetailField></div>}
              {account.role === 'seller' && (
                <>
                  <DetailField label="Onboarding">{detail.isOnboarded ? 'Completed' : 'Not finished'}</DetailField>
                  <DetailField label="Stripe payouts"><span className="capitalize">{(detail.stripeConnectStatus ?? 'not_connected').replace('_', ' ')}</span></DetailField>
                </>
              )}
              <div className="col-span-2"><DetailField label="Account ID"><span className="text-[12px] text-slate font-mono">{account.id}</span></DetailField></div>
            </>
          ) : null}
        </div>
        {detailError && (
          <p className="text-[12px] text-error">
            Couldn't load full details: {detailError}{' '}
            <button onClick={reload} className="underline bg-transparent border-none p-0 text-error cursor-pointer text-[12px]">Retry</button>
          </p>
        )}
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

export function AdminUsers() {
  usePageTitle('Users');
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useAdminUsersStats();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search: search || undefined,
      role: (roleFilter || undefined) as AccountRole | undefined,
      status: statusFilter || undefined,
      page,
      limit: 10,
    }),
    [search, roleFilter, statusFilter, page],
  );

  const { data, loading, error, refetch } = useAdminUsersList(query);
  const { suspend, unsuspend, processingId, error: actionError } = useAdminUserActions();

  const [viewing, setViewing] = useState<AccountRow | null>(null);
  const [confirming, setConfirming] = useState<AccountRow | null>(null);
  const toast = useToast();

  function refreshAll() { refetchStats(); refetch(); }

  async function handleToggleSuspend() {
    if (!confirming) return;
    const isSuspended = confirming.status === 'suspended';
    const ok = isSuspended ? await unsuspend(confirming.role, confirming.id) : await suspend(confirming.role, confirming.id);
    if (ok) { setConfirming(null); toast.success(isSuspended ? 'Account unsuspended' : 'Account suspended'); refreshAll(); }
  }

  // One row per person: accounts that share an email (e.g. buyer + seller) are grouped, each with its own role chip and actions.
  // Grouping is per loaded page, so a person whose other account is on another page shows as separate rows until both load.
  const people = useMemo<PersonRow[]>(() => {
    const map = new Map<string, PersonRow>();
    for (const a of data?.items ?? []) {
      const key = a.email.trim().toLowerCase();
      const row = map.get(key);
      if (row) row.accounts.push(a); else map.set(key, { key, accounts: [a] });
    }
    return [...map.values()];
  }, [data]);

  const columns: TableColumn<PersonRow>[] = [
    {
      key: 'name',
      header: 'Person',
      render: (p) => {
        const u = p.accounts[0];
        return (
          <div className="flex items-center gap-[10px] min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-pale-orange text-brand-deep-orange text-[12px] font-bold flex items-center justify-center shrink-0">
              {initialsOf(u.name)}
            </div>
            <div className="min-w-0">
              <CellText max={200} className="text-[13px] font-semibold text-charcoal">{u.name}</CellText>
              <CellText max={200} className="text-[12px] text-slate">{u.email}</CellText>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role', header: 'Roles',
      render: (p) => <div className="flex flex-wrap gap-1">{p.accounts.map(u => <Badge key={u.id} color={ROLE_COLOR[u.role]} size="sm">{ROLE_LABEL[u.role]}</Badge>)}</div>,
    },
    { key: 'plan', header: 'Plan', render: (p) => <span className="text-[13px] text-graphite capitalize">{[...new Set(p.accounts.map(u => u.plan))].join(' / ')}</span> },
    {
      key: 'status', header: 'Status',
      render: (p) => <div className="flex flex-col gap-1 items-start">{p.accounts.map(u => (
        <span key={u.id} className="inline-flex items-center gap-1">{p.accounts.length > 1 && <span className="text-[12px] text-slate">{ROLE_LABEL[u.role]}:</span>}<StatusBadge status={u.status} size="sm" /></span>
      ))}</div>,
    },
    { key: 'createdAt', header: 'Joined', render: (p) => <span className="num text-[13px] text-slate whitespace-nowrap">{formatDate(p.accounts.map(u => u.createdAt).sort()[0])}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <div className="flex flex-col gap-[6px]">
          {p.accounts.map(u => (
            <div key={u.id} className="flex gap-[6px] items-center">
              {p.accounts.length > 1 && <span className="text-[12px] text-slate w-[52px] shrink-0">{ROLE_LABEL[u.role]}</span>}
              <Button size="xs" variant="outline" icon={<Eye size={11} />} onClick={() => setViewing(u)}>View</Button>
              <Button
                size="xs"
                variant={u.status === 'suspended' ? 'secondary' : 'danger'}
                icon={u.status === 'suspended' ? <CheckCircle2 size={11} /> : <Ban size={11} />}
                disabled={processingId === u.id}
                onClick={() => setConfirming(u)}
              >
                {u.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
              </Button>
            </div>
          ))}
        </div>
      ),
    },
  ];
  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · People" title="Users & Sellers" subtitle="Manage all platform users, sellers and accounts." />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}

      {statsError ? (
        <AnalyticsErrorState message={statsError} onRetry={refetchStats} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {statsLoading && !stats ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={92} rounded="10px" />)
          ) : stats ? (
            <>
              <MetricCard label="Total Buyer Accounts" value={formatNumber(stats.totalBuyers)} />
              <MetricCard label="Active Seller Accounts" value={formatNumber(stats.activeSellerAccounts)} />
              <MetricCard label="Suspended" value={formatNumber(stats.suspended)} sub="Buyers + sellers blocked from signing in" />
            </>
          ) : null}
        </div>
      )}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or email…" className="flex-1 max-w-[280px]" />
          <FilterDropdown placeholder="All Roles" options={ROLE_OPTIONS} value={roleFilter} onChange={(v) => { setRoleFilter(v); setPage(1); }} />
          <FilterDropdown placeholder="All Statuses" options={STATUS_OPTIONS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
        </div>

        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            cardsBelow="lg"
            columns={columns}
            data={people}
            keyExtractor={(p) => p.key}
            loading={loading}
            emptyState={{ icon: <Users2 size={28} className="text-slate/50" />, title: 'No accounts match your filters', description: 'Try adjusting your search or clearing filters.' }}
            pagination={{ page, total: data?.total ?? 0, perPage: 10, onChange: setPage, label: 'accounts' }}
          />
        )}
      </div>

      {viewing && <AccountDetailModal account={viewing} onClose={() => setViewing(null)} onChanged={msg => { setViewing(null); toast.success(msg); refreshAll(); }} />}

      {confirming && (
        <Modal mobileSheet
          title={confirming.status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}
          onClose={() => setConfirming(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
            <Button variant={confirming.status === 'suspended' ? 'secondary' : 'danger'} onClick={handleToggleSuspend} loading={processingId === confirming.id}>
              {confirming.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
            </Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            {confirming.status === 'suspended'
              ? <>Restore access for "<strong>{confirming.name}</strong>"? They will be able to log in again immediately.</>
              : <>Suspend "<strong>{confirming.name}</strong>"? They will be immediately blocked from accessing the platform.</>}
          </p>
        </Modal>
      )}
      </div>
    </>
  );
}
